"use server";

import { confirmPublicAccountDeletion, requestPublicAccountDeletion } from "@/lib/account-deletion";

export type AccountDeletionFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  dueAt?: string;
};

export async function submitPublicAccountDeletion(
  _state: AccountDeletionFormState,
  formData: FormData,
): Promise<AccountDeletionFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { status: "error", message: "Enter a valid email address." };
  }
  try {
    await requestPublicAccountDeletion(email);
  } catch {
    // Account existence and delivery state must not be observable publicly.
  }
  return {
    status: "success",
    message: "If a RollFinders account exists for that email, a confirmation link has been sent.",
  };
}

export async function confirmPublicAccountDeletionAction(
  _state: AccountDeletionFormState,
  formData: FormData,
): Promise<AccountDeletionFormState> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) {
    return { status: "error", message: "This confirmation link is invalid or expired." };
  }
  try {
    const request = await confirmPublicAccountDeletion(token);
    return {
      status: "success",
      message: "Your account deletion request has been verified.",
      dueAt: request.dueAt ?? undefined,
    };
  } catch {
    return { status: "error", message: "This confirmation link is invalid, expired, or has already been used." };
  }
}
