"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdminPage, writeAdminAuditLog } from "@/lib/admin";
import { queuePasswordChangedEmail } from "@/lib/password-reset";
import { changeUserPassword } from "@/lib/users-service";

export type ChangeSuperAdminPasswordState = {
  message: string;
  success: boolean;
};

export async function auditPlatformSettingsReview(formData: FormData) {
  const actor = await requireSuperAdminPage();
  const setting = String(formData.get("setting") ?? "platform-settings").trim();

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "PLATFORM_SETTINGS_REVIEWED",
    metadata: { setting },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}

export async function changeSuperAdminPassword(
  _state: ChangeSuperAdminPasswordState,
  formData: FormData,
): Promise<ChangeSuperAdminPasswordState> {
  const actor = await requireSuperAdminPage();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { success: false, message: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { success: false, message: "Passwords do not match." };
  }

  await changeUserPassword(actor.id, password);

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: actor.id,
    action: "SUPER_ADMIN_PASSWORD_CHANGED",
    metadata: { changedBy: actor.id },
  });
  await queuePasswordChangedEmail(actor);

  revalidatePath("/admin/settings");
  return { success: true, message: "Password changed successfully." };
}
