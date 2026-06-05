"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser } from "@/lib/standard-dashboard";

export type ChangePasswordState = {
  message: string;
  success: boolean;
};

export async function changeStandardUserPassword(
  _state: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const { user } = await requireDashboardUser();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { success: false, message: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { success: false, message: "Passwords do not match." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { success: true, message: "Password changed successfully." };
}
