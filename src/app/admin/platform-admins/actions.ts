"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdminPage, writeAdminAuditLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function createPlatformAdmin(formData: FormData) {
  const actor = await requireSuperAdminPage();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    redirect("/admin/platform-admins?error=invalid-email");
  }

  const target = await prisma.user.findUnique({ where: { email } });

  if (target) {
    if (target.role === Role.SUPER_ADMIN || target.role === Role.ADMIN) {
      redirect("/admin/platform-admins?error=super-admin");
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { role: Role.PLATFORM_ADMIN, disabled: false },
    });

    await writeAdminAuditLog({
      actorUserId: actor.id,
      targetUserId: target.id,
      action: "PLATFORM_ADMIN_PROMOTED",
      metadata: { email },
    });

    revalidatePath("/admin/platform-admins");
    redirect("/admin/platform-admins?created=1");
  }

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "PLATFORM_ADMIN_INVITED",
    metadata: { email },
  });

  revalidatePath("/admin/platform-admins");
  redirect("/admin/platform-admins?invited=1");
}

export async function removePlatformAdmin(userId: string) {
  const actor = await requireSuperAdminPage();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  if (target.role === Role.SUPER_ADMIN || target.role === Role.ADMIN) {
    redirect("/admin/platform-admins?error=super-admin");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: Role.STANDARD_USER },
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: userId,
    action: "PLATFORM_ADMIN_REMOVED",
    metadata: { email: target.email },
  });

  revalidatePath("/admin/platform-admins");
}
