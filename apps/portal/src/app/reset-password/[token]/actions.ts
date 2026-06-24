"use server";

import { resetPasswordWithToken } from "@/lib/password-reset";

export type ResetPasswordState = {
  message: string;
  success: boolean;
};

export async function resetPassword(token: string, _state: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { success: false, message: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { success: false, message: "Passwords do not match." };
  }

  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) {
    return { success: false, message: result.message ?? "This password reset link is invalid or expired." };
  }

  return { success: true, message: "Your password has been reset successfully. You can now sign in." };
}
