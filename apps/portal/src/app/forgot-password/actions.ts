"use server";

import { requestPasswordResetForEmail } from "@/lib/password-reset";

export type ForgotPasswordState = {
  message: string;
  success: boolean;
};

export async function requestPasswordReset(_state: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "");
  try {
    await requestPasswordResetForEmail(email);
  } catch (error) {
    console.error("[forgot-password] password reset request failed", error);
  }

  return {
    success: true,
    message: "If an account exists for this email, a password reset link has been sent.",
  };
}
