import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string; email?: string } | undefined;
  if (!user?.id || !user.email) return null;
  return { id: user.id, role: user.role, email: user.email };
}

export function isSuperAdminRole(role?: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function isPlatformAdminRole(role?: string) {
  return isSuperAdminRole(role) || role === "PLATFORM_ADMIN";
}

export async function requireAdminPage() {
  const user = await getCurrentUser();
  if (!isPlatformAdminRole(user?.role)) {
    redirect("/login");
  }
}

export async function requireSuperAdminPage() {
  const user = await getCurrentUser();
  if (!isSuperAdminRole(user?.role)) {
    redirect("/admin");
  }
  return user;
}

export async function requireAdminApi() {
  const user = await getCurrentUser();
  if (!isPlatformAdminRole(user?.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return null;
}

export async function requireSuperAdminApi() {
  const user = await getCurrentUser();
  if (!isSuperAdminRole(user?.role)) {
    return { response: NextResponse.json({ error: "Super admin access required" }, { status: 403 }), user: null };
  }
  return { response: null, user };
}

export function isProtectedSuperAdmin(user: { email: string; isProtected?: boolean | null }) {
  return user.isProtected === true || user.email.toLowerCase() === "admin@rollfinder.local";
}

export async function writeAdminAuditLog({
  actorUserId,
  targetUserId,
  action,
  metadata,
}: {
  actorUserId: string;
  targetUserId?: string | null;
  action: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.adminAuditLog.create({
    data: {
      actorUserId,
      targetUserId,
      action,
      metadata: metadata ?? undefined,
    },
  });
}
