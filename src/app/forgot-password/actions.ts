"use server";

import { requestPasswordResetForEmail } from "@/lib/password-reset";

export type ForgotPasswordState = {
  message: string;
  success: boolean;
};

export async function requestPasswordReset(_state: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "");
  await requestPasswordResetForEmail(email);

  return {
    success: true,
    message: "If an account exists for this email, a password reset link has been sent.",
  };
}
