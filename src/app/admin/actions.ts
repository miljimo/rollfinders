"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function toggleUserDisabled(userId: string) {
  await requireAdminPage();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await prisma.user.update({
    where: { id: userId },
    data: { disabled: !user.disabled },
  });

  revalidatePath("/admin");
}
