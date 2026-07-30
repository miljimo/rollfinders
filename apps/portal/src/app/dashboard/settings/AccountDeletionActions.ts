"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/admin";
import {
  cancelCurrentAccountDeletionRequest,
  createSelfAccountDeletionRequest,
} from "@/lib/users-service";
import { sendAccountDeletionAcknowledgement } from "@/lib/account-deletion";

function settingsHref(formData: FormData, notice: string) {
  const params = new URLSearchParams({ panel: "settings", deletionNotice: notice });
  if (formData.get("surface") === "mobile") params.set("surface", "mobile");
  return `/dashboard?${params.toString()}`;
}

export async function requestOwnAccountDeletion(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (formData.get("confirm") !== "yes") {
    redirect(settingsHref(formData, "confirmation-required"));
  }
  const { request } = await createSelfAccountDeletionRequest(user);
  await sendAccountDeletionAcknowledgement(user, request).catch(() => undefined);
  redirect(settingsHref(formData, "requested"));
}

export async function cancelOwnAccountDeletion(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await cancelCurrentAccountDeletionRequest(user);
  redirect(settingsHref(formData, "cancelled"));
}
