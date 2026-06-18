"use server";

import { requireDashboardUser } from "@/lib/standard-dashboard";
import { isAnyAdminRole, isStandardUserRole } from "@/lib/admin";

export type EditProfileState = {
  message: string;
  success: boolean;
};

export async function updateStandardUserProfile(
  _state: EditProfileState,
  formData: FormData,
): Promise<EditProfileState> {
  const { user } = await requireDashboardUser();
  if (!isStandardUserRole(user.role) && !isAnyAdminRole(user.role)) {
    return { success: false, message: "Profile editing is only available for self-service dashboard users here." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length > 120) {
    return { success: false, message: "Name must be 120 characters or fewer." };
  }

  console.warn(`Profile display name update for ${user.id} is managed by the users service. Requested name: ${name}`);
  return { success: true, message: "Profile updates are managed by the users service." };
}
