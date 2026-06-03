"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role, UserStatus } from "@prisma/client";
import { isProtectedSuperAdmin, requireSuperAdminPage, writeAdminAuditLog } from "@/lib/admin";
import { queuePasswordResetEmail } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

function normalizeRole(value: string) {
  if (value === Role.PLATFORM_ADMIN) return Role.PLATFORM_ADMIN;
  return Role.STANDARD_USER;
}

function normalizeStatus(value: string) {
  return value === UserStatus.DISABLED ? UserStatus.DISABLED : UserStatus.ACTIVE;
}

async function targetUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function createManagedUser(formData: FormData) {
  const actor = await requireSuperAdminPage();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = normalizeRole(String(formData.get("role") ?? Role.STANDARD_USER));
  const password = String(formData.get("password") ?? "rollfinder-user");

  if (!email || !email.includes("@")) return;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name || null,
      email,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
      disabled: false,
    },
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: user.id,
    action: "USER_CREATED",
    metadata: { email, role },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function updateManagedUser(userId: string, formData: FormData) {
  const actor = await requireSuperAdminPage();
  const user = await targetUser(userId);
  if (!user) return;
  const protectedUser = isProtectedSuperAdmin(user);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = protectedUser ? user.role : normalizeRole(String(formData.get("role") ?? user.role));
  const status = protectedUser ? user.status : normalizeStatus(String(formData.get("status") ?? user.status));

  if (!email || !email.includes("@")) return;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || null,
      email,
      role,
      status,
      disabled: status === UserStatus.DISABLED,
    },
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: userId,
    action: "USER_EDITED",
    metadata: {
      previous: { name: user.name, email: user.email, role: user.role, status: user.status },
      next: { name: updated.name, email: updated.email, role: updated.role, status: updated.status },
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function toggleManagedUserDisabled(userId: string) {
  const actor = await requireSuperAdminPage();
  const user = await targetUser(userId);
  if (!user || isProtectedSuperAdmin(user)) return;

  const disabled = user.status !== UserStatus.DISABLED;
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
  const actor = await requireSuperAdminPage();
  const user = await targetUser(userId);
  if (!user || isProtectedSuperAdmin(user)) return;

  await prisma.user.update({ where: { id: userId }, data: { role: Role.PLATFORM_ADMIN } });
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
  const actor = await requireSuperAdminPage();
  const user = await targetUser(userId);
  if (!user || isProtectedSuperAdmin(user)) return;

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
  const actor = await requireSuperAdminPage();
  if (actor.id === userId) return;

  const user = await targetUser(userId);
  if (!user || isProtectedSuperAdmin(user)) return;

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

export async function sendPasswordChangeEmail(userId: string) {
  const actor = await requireSuperAdminPage();
  const user = await targetUser(userId);
  if (!user) return;

  const { expiresAt } = await queuePasswordResetEmail(user);
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: user.id,
    action: "PASSWORD_CHANGE_EMAIL_SENT",
    metadata: { email: user.email, expiresAt: expiresAt.toISOString() },
  });

  revalidatePath("/admin/users");
}
