"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role, UserEmailStatus, UserStatus } from "@prisma/client";
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

export async function deleteInvalidEmailRecord(invalidEmailId: string) {
  const actor = await requireSuperAdminPage();
  const invalidEmail = await prisma.invalidEmailAddress.findUnique({ where: { id: invalidEmailId } });
  if (!invalidEmail) return;

  await prisma.$transaction(async (tx) => {
    await tx.invalidEmailAddress.delete({ where: { id: invalidEmailId } });
    if (invalidEmail.userId) {
      await tx.user.update({
        where: { id: invalidEmail.userId },
        data: {
          emailStatus: UserEmailStatus.VALID,
          emailInvalidReason: null,
          emailInvalidAt: null,
        },
      });
    }
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: invalidEmail.userId,
    action: "INVALID_EMAIL_RECORD_DELETED",
    metadata: { email: invalidEmail.email },
  });

  revalidatePath("/admin");
}

export async function deleteInvalidEmailUser(invalidEmailId: string) {
  const actor = await requireSuperAdminPage();
  const invalidEmail = await prisma.invalidEmailAddress.findUnique({
    where: { id: invalidEmailId },
    include: { user: true },
  });
  if (!invalidEmail?.user || isProtectedSuperAdmin(invalidEmail.user)) return;

  await prisma.user.delete({ where: { id: invalidEmail.user.id } });
  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: null,
    action: "INVALID_EMAIL_USER_DELETED",
    metadata: { email: invalidEmail.email, deletedUserId: invalidEmail.user.id },
  });

  revalidatePath("/admin");
}
