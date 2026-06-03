"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role, UserStatus } from "@prisma/client";
import { isProtectedSuperAdmin, requireSuperAdminPage, writeAdminAuditLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function toggleUserDisabled(userId: string) {
  const actor = await requireSuperAdminPage();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (isProtectedSuperAdmin(user)) return;

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

  revalidatePath("/admin");
}

export async function createUser(formData: FormData) {
  const actor = await requireSuperAdminPage();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleValue = String(formData.get("role") ?? Role.STANDARD_USER);

  if (!email || !email.includes("@")) return;
  const role = roleValue === Role.PLATFORM_ADMIN ? Role.PLATFORM_ADMIN : Role.STANDARD_USER;
  const passwordHash = await bcrypt.hash(String(formData.get("password") ?? "rollfinder-user"), 10);

  const user = await prisma.user.create({
    data: {
      name: name || null,
      email,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
    },
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: user.id,
    action: "USER_CREATED",
    metadata: { email, role },
  });

  revalidatePath("/admin");
}

export async function updateUserRole(userId: string, formData: FormData) {
  const actor = await requireSuperAdminPage();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || isProtectedSuperAdmin(user)) return;

  const roleValue = String(formData.get("role") ?? Role.STANDARD_USER);
  const role = roleValue === Role.PLATFORM_ADMIN ? Role.PLATFORM_ADMIN : Role.STANDARD_USER;
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: userId,
    action: "USER_ROLE_UPDATED",
    metadata: { email: user.email, role },
  });

  revalidatePath("/admin");
}
