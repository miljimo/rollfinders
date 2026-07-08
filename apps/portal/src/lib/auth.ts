import type { NextAuthOptions } from "next-auth";
import { decode as decodeJwt, encode as encodeJwt } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { allowedAuthRedirectOrigins } from "./auth-urls";
import { authenticateUserCredentials, logoutUserSession, UserServiceError } from "./users-service";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "rollfinders-local-development-nextauth-secret",
  session: { strategy: "jwt" },
  jwt: {
    async encode(params) {
      return encodeJwt(params);
    },
    async decode(params) {
      try {
        return await decodeJwt(params);
      } catch (error) {
        if (error instanceof Error && error.message.includes("decryption operation failed")) return null;
        throw error;
      }
    },
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) throw new Error("MissingCredentials");
        try {
          const result = await authenticateUserCredentials(credentials.email, credentials.password);
          return {
            id: result.user_id,
            email: null,
            name: null,
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
            accessTokenExpiresIn: result.expires_in,
          };
        } catch (error) {
          if (error instanceof UserServiceError) {
            if (error.message === "Account disabled.") throw new Error("AccountDisabled");
            if (error.message === "Academy membership is required.") throw new Error("AcademyRequired");
            if (error.message === "Verify your email before signing in.") throw new Error("EmailVerificationRequired");
          }
          throw new Error("InvalidCredentials");
        }
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        if (allowedAuthRedirectOrigins(baseUrl).includes(target.origin)) return target.toString();
      } catch {
        return baseUrl;
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as {
          accessToken?: string;
          refreshToken?: string;
          accessTokenExpiresIn?: number;
        };
        token.accessToken = authUser.accessToken;
        token.refreshToken = authUser.refreshToken;
        token.accessTokenExpiresIn = authUser.accessTokenExpiresIn;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: unknown }).id = token.sub;
      }
      (session as { accessToken?: unknown }).accessToken = token.accessToken;
      (session as { accessTokenExpiresIn?: unknown }).accessTokenExpiresIn = token.accessTokenExpiresIn;
      return session;
    },
  },
  logger: {
    error(code, metadata) {
      const codeText = String(code);
      const message = metadata instanceof Error ? metadata.message : "";
      if (codeText === "JWT_SESSION_ERROR" || message.includes("decryption operation failed")) return;
      console.error(`[next-auth][error][${code}]`, metadata);
    },
    warn(code) {
      if (code === "NO_SECRET" || code === "NEXTAUTH_URL") return;
      console.warn(`[next-auth][warn][${code}]`);
    },
    debug() {},
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const refreshToken = typeof token?.refreshToken === "string" ? token.refreshToken : null;
      await logoutUserSession(refreshToken);
    },
  },
};
