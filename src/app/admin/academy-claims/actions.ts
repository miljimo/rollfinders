"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, isPlatformAdminRole } from "@/lib/admin";
import { postClaimDecision } from "./api";

async function requireClaimReviewer() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isPlatformAdminRole(user.role)) redirect("/");
  return user;
}

function detailHref(claimId: string, params?: Record<string, string>) {
  const search = new URLSearchParams(params);
  const query = search.toString();
  return `/admin/academy-claims/${encodeURIComponent(claimId)}${query ? `?${query}` : ""}`;
}

export async function approveAcademyClaim(claimId: string) {
  await requireClaimReviewer();
  const result = await postClaimDecision(claimId, "approve");
  revalidatePath("/admin/academy-claims");
  revalidatePath(`/admin/academy-claims/${claimId}`);

  if (!result.ok) {
    redirect(detailHref(claimId, { error: result.message }));
  }

  redirect(detailHref(claimId, { decision: "approved" }));
}

export async function rejectAcademyClaim(claimId: string, formData: FormData) {
  await requireClaimReviewer();
  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();
  if (!rejectionReason) {
    redirect(detailHref(claimId, { error: "Rejection reason is required." }));
  }

  const result = await postClaimDecision(claimId, "reject", { rejectionReason });
  revalidatePath("/admin/academy-claims");
  revalidatePath(`/admin/academy-claims/${claimId}`);

  if (!result.ok) {
    redirect(detailHref(claimId, { error: result.message }));
  }

  redirect(detailHref(claimId, { decision: "rejected" }));
}
