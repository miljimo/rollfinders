import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { InvitationStatus, Role } from "@prisma/client";
import { recordAcademyAdminActivatedActivity } from "./platform-admin-activity";
import { prisma } from "./prisma";

async function platformAdminActivationAttribution(user: { id: string; email: string }) {
  const invitation = await prisma.academyInvitation.findFirst({
    where: {
      invitedEmail: user.email,
      status: InvitationStatus.ACCEPTED,
      invitedBy: { role: Role.PLATFORM_ADMIN },
    },
    select: { invitedById: true },
    orderBy: { createdAt: "asc" },
  });
  if (invitation) return invitation.invitedById;

  const userAction = await prisma.adminAuditLog.findFirst({
    where: {
      targetUserId: user.id,
      action: { in: ["USER_CREATED", "USER_EDITED"] },
      actor: { role: Role.PLATFORM_ADMIN },
    },
    select: { actorUserId: true },
    orderBy: { createdAt: "asc" },
  });
  return userAction?.actorUserId ?? null;
}

async function recordAcademyAdminActivation(user: { id: string; email: string; role: Role; lastLoginAt: Date | null }) {
  if (user.lastLoginAt || user.role !== Role.ACADEMY_ADMIN) return;

  const actorUserId = await platformAdminActivationAttribution(user);
  if (!actorUserId) return;

  await recordAcademyAdminActivatedActivity(actorUserId, user.id);
}

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
        await recordAcademyAdminActivation(user);
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
