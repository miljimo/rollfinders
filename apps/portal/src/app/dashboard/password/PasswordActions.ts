"use server";

import { revalidatePath } from "next/cache";
import { writeAdminAuditLog } from "@/lib/admin";
import { queuePasswordChangedEmail } from "@/lib/password-reset";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import { changeUserPassword } from "@/lib/users-service";

export type ChangePasswordState = {
  message: string;
  success: boolean;
};

export async function changeDashboardUserPassword(
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

  await changeUserPassword(user.id, password);
  await writeAdminAuditLog({
    actorUserId: user.id,
    targetUserId: user.id,
    action: "DASHBOARD_PASSWORD_CHANGED",
    metadata: { role: user.role },
  });
  await queuePasswordChangedEmail(user);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/password");
  revalidatePath("/admin/settings");

  return { success: true, message: "Password changed successfully." };
}

export const changeStandardUserPassword = changeDashboardUserPassword;
