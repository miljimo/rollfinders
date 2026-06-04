import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) throw new Error("MissingCredentials");
        const user = await prisma.user.findUnique({ where: { email: credentials.email.toLowerCase() } });
        if (!user) throw new Error("InvalidCredentials");
        if (user.disabled || user.status === "DISABLED") throw new Error("AccountDisabled");
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) throw new Error("InvalidCredentials");
        if ((user.role === Role.STANDARD_USER || user.role === Role.USER) && !user.academyId) {
          const membership = await prisma.academyMember.findFirst({ where: { userId: user.id } });
          if (!membership) throw new Error("AcademyRequired");
        }
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: unknown }).id = token.sub;
        (session.user as { role?: unknown }).role = token.role;
      }
      return session;
    },
  },
};
