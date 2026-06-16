"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role, UserStatus } from "@prisma/client";
import { canSendManagedUserPasswordReset, getCurrentUser, isAcademyAdminRole, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole, requireAdminPage, writeAdminAuditLog } from "@/lib/admin";
import { managedUsersReturnPath } from "@/lib/managed-user-return-path";
import { requestPasswordResetForEmail } from "@/lib/password-reset";
import { ensurePlatformAdminProfile } from "@/lib/platform-admin-activity";
import { prisma } from "@/lib/prisma";

function normalizeRole(value: string) {
  if (value === Role.SUPER_ADMIN) return Role.SUPER_ADMIN;
  if (value === Role.ADMIN) return Role.ADMIN;
  if (value === Role.ACADEMY_ADMIN) return Role.ACADEMY_ADMIN;
  if (value === Role.PLATFORM_ADMIN) return Role.PLATFORM_ADMIN;
  return Role.STANDARD_USER;
}

function normalizeStatus(value: string) {
  return value === UserStatus.DISABLED ? UserStatus.DISABLED : UserStatus.ACTIVE;
}

async function targetUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

async function requireUserManager() {
  await requireAdminPage();
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Admin access required");
  return actor;
}

function canManageUser(actor: { id: string; role?: string; academyId?: string | null }, target: { id: string; role: Role; email: string; academyId?: string | null; isProtected?: boolean | null }) {
  if (isAcademyAdminRole(actor.role)) {
    return actor.id !== target.id && actor.academyId === target.academyId && (target.role === Role.STANDARD_USER || target.role === Role.USER || target.role === Role.ACADEMY_ADMIN || target.role === Role.ACADEMY_OWNER);
  }
  const actorRole = actor.role;
  if (isSuperAdminRole(actorRole)) return true;
  if (!isPlatformAdminRole(actorRole)) return false;
  if (isProtectedSuperAdmin(target)) return false;
  return target.role !== Role.SUPER_ADMIN && target.role !== Role.ADMIN && target.role !== Role.PLATFORM_ADMIN;
}

async function validManagedAcademyId(actor: { role?: string; academyId?: string | null }, role: Role, academyId: string | null) {
  if (role !== Role.STANDARD_USER && role !== Role.ACADEMY_ADMIN && role !== Role.USER) return null;
  if (isAcademyAdminRole(actor.role)) return actor.academyId ?? undefined;
  if (!academyId) return undefined;
  const academyExists = await prisma.academy.count({ where: { id: academyId } });
  return academyExists ? academyId : undefined;
}

function isSuperUser(user: { role: Role }) {
  return user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function hasAnotherActiveSuperUser(userId: string) {
  const count = await prisma.user.count({
    where: {
      id: { not: userId },
      role: { in: [Role.SUPER_ADMIN, Role.ADMIN] },
      status: UserStatus.ACTIVE,
      disabled: false,
    },
  });
  return count > 0;
}

export async function createManagedUser(formData: FormData) {
  const actor = await requireUserManager();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const requestedRole = normalizeRole(String(formData.get("role") ?? Role.STANDARD_USER));
  const role = isSuperAdminRole(actor.role)
    ? requestedRole
    : requestedRole === Role.ACADEMY_ADMIN ? Role.ACADEMY_ADMIN : Role.STANDARD_USER;
  const academyId = await validManagedAcademyId(actor, role, String(formData.get("academyId") ?? "").trim() || null);
  const password = String(formData.get("password") ?? "rollfinder-user");

  if (!email || !email.includes("@")) return;
  if (academyId === undefined) return;
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const redirectTo = managedUsersReturnPath(returnTo);
  const passwordHash = await bcrypt.hash(password, 10);
  let user: { id: string };
  try {
    user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        passwordHash,
        role,
        academyId,
        status: UserStatus.ACTIVE,
        disabled: false,
      },
      select: { id: true },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const url = new URL(redirectTo, "http://localhost");
    url.searchParams.set("userResult", "duplicate_email");
    url.searchParams.set("email", email);
    redirect(`${url.pathname}${url.search}`);
  }
  if (role === Role.PLATFORM_ADMIN) {
    await ensurePlatformAdminProfile(user.id);
  }

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: user.id,
    action: "USER_CREATED",
    metadata: { email, role, academyId },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(redirectTo);
}

export async function updateManagedUser(userId: string, formData: FormData) {
  const actor = await requireUserManager();
  const user = await targetUser(userId);
  if (!user || !canManageUser(actor, user)) return;
  const protectedUser = isProtectedSuperAdmin(user);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const requestedRole = normalizeRole(String(formData.get("role") ?? user.role));
  const proposedRole = protectedUser || (actor.id === userId && isSuperUser(user))
    ? user.role
    : isSuperAdminRole(actor.role)
      ? requestedRole
      : requestedRole === Role.ACADEMY_ADMIN ? Role.ACADEMY_ADMIN : Role.STANDARD_USER;
  if (isSuperUser(user) && !isSuperUser({ role: proposedRole }) && !(await hasAnotherActiveSuperUser(userId))) return;
  const role = proposedRole;
  const status = protectedUser ? user.status : normalizeStatus(String(formData.get("status") ?? user.status));
  if (actor.id === userId && isSuperUser(user) && status === UserStatus.DISABLED && !(await hasAnotherActiveSuperUser(userId))) return;

  if (!email || !email.includes("@")) return;
  const academyId = await validManagedAcademyId(actor, role, String(formData.get("academyId") ?? user.academyId ?? "").trim() || null);
  if (academyId === undefined) return;
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const redirectTo = managedUsersReturnPath(returnTo);

  let updated: Awaited<ReturnType<typeof prisma.user.update>>;
  try {
    updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || null,
        email,
        role,
        academyId,
        status,
        disabled: status === UserStatus.DISABLED,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const url = new URL(redirectTo, "http://localhost");
    url.searchParams.set("userResult", "duplicate_email");
    url.searchParams.set("email", email);
    redirect(`${url.pathname}${url.search}`);
  }

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: userId,
    action: "USER_EDITED",
    metadata: {
      previous: { name: user.name, email: user.email, role: user.role, academyId: user.academyId, status: user.status },
      next: { name: updated.name, email: updated.email, role: updated.role, academyId: updated.academyId, status: updated.status },
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(redirectTo);
}

export async function toggleManagedUserDisabled(userId: string) {
  const actor = await requireUserManager();
  const user = await targetUser(userId);
  if (!user || !canManageUser(actor, user)) return;

  const disabled = user.status !== UserStatus.DISABLED;
  if (actor.id === userId && isSuperUser(user) && disabled && !(await hasAnotherActiveSuperUser(userId))) return;
  await prisma.user.update({
    where: { id: userId },
    data: { disabled, status: disabled ? UserStatus.DISABLED : UserStatus.ACTIVE },
  });
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: userId,
    action: disabled ? "USER_DISABLED" : "USER_ENABLED",
    metadata: { email: user.email },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function promoteManagedUser(userId: string) {
  const actor = await requireUserManager();
  const user = await targetUser(userId);
  if (!user || !canManageUser(actor, user) || !isSuperAdminRole(actor.role)) return;

  await prisma.user.update({ where: { id: userId }, data: { role: Role.PLATFORM_ADMIN } });
  await ensurePlatformAdminProfile(userId);
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: userId,
    action: "USER_PROMOTED",
    metadata: { email: user.email, previousRole: user.role, role: Role.PLATFORM_ADMIN },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function demoteManagedUser(userId: string) {
  const actor = await requireUserManager();
  const user = await targetUser(userId);
  if (!user || !canManageUser(actor, user) || !isSuperAdminRole(actor.role)) return;
  if (actor.id === userId || isSuperUser(user)) return;

  await prisma.user.update({ where: { id: userId }, data: { role: Role.STANDARD_USER } });
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: userId,
    action: "USER_DEMOTED",
    metadata: { email: user.email, previousRole: user.role, role: Role.STANDARD_USER },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function deleteManagedUser(userId: string) {
  const actor = await requireUserManager();
  if (actor.id === userId) return;

  const user = await targetUser(userId);
  if (!user || !canManageUser(actor, user)) return;
  if (isSuperUser(user)) return;

  await prisma.user.delete({ where: { id: userId } });
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: null,
    action: "USER_DELETED",
    metadata: { email: user.email, deletedUserId: user.id },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function sendPasswordChangeEmail(userId: string, formData?: FormData) {
  const actor = await requireUserManager();
  const user = await targetUser(userId);
  const returnTo = managedUsersReturnPath(String(formData?.get("returnTo") ?? "/dashboard?panel=users"));
  if (!user || !canSendManagedUserPasswordReset(actor, user)) {
    const url = new URL(returnTo, "http://localhost");
    url.searchParams.set("userResult", "password_reset_failed");
    redirect(`${url.pathname}${url.search}`);
  }

  let expiresAt: Date;
  try {
    const result = await requestPasswordResetForEmail(user.email);
    if (!result.expiresAt) throw new Error("Password reset email was not sent.");
    expiresAt = result.expiresAt;
  } catch {
    const url = new URL(returnTo, "http://localhost");
    url.searchParams.set("userResult", "password_reset_failed");
    url.searchParams.set("email", user.email);
    redirect(`${url.pathname}${url.search}`);
  }
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: user.id,
    action: "USER_PASSWORD_RESET_EMAIL_SENT",
    metadata: { email: user.email, expiresAt: expiresAt.toISOString() },
  });

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  const url = new URL(returnTo, "http://localhost");
  url.searchParams.set("userResult", "password_reset_sent");
  url.searchParams.set("email", user.email);
  redirect(`${url.pathname}${url.search}`);
}
