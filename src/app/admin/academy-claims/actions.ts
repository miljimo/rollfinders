"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { approveAcademyClaim as approveClaim, queueClaimApprovedEmail, queueClaimRejectedEmail, rejectAcademyClaim as rejectClaim } from "@/lib/claim-requests";
import { getCurrentUser, isPlatformAdminRole } from "@/lib/admin";

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

function returnToFromFormData(formData?: FormData) {
  const value = String(formData?.get("returnTo") ?? "").trim();
  return value.startsWith("/admin?panel=academy-claims") ? value : "/admin?panel=academy-claims";
}

export async function approveAcademyClaim(claimId: string, formData?: FormData) {
  const user = await requireClaimReviewer();
  const returnTo = returnToFromFormData(formData);
  const result = await approveClaim(claimId, user.id);
  revalidatePath("/admin/academy-claims");
  revalidatePath("/admin");
  revalidatePath(`/admin/academy-claims/${claimId}`);

  if (!result.ok) {
    redirect(detailHref(claimId, { error: result.error, returnTo }));
  }
  if (result.user) {
    await queueClaimApprovedEmail(result.user).catch(() => undefined);
  }

  redirect(detailHref(claimId, { decision: "approved", returnTo }));
}

export async function rejectAcademyClaim(claimId: string, formData: FormData) {
  const user = await requireClaimReviewer();
  const returnTo = returnToFromFormData(formData);
  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();
  if (!rejectionReason) {
    redirect(detailHref(claimId, { error: "Rejection reason is required.", returnTo }));
  }

  const result = await rejectClaim(claimId, user.id, rejectionReason);
  revalidatePath("/admin/academy-claims");
  revalidatePath("/admin");
  revalidatePath(`/admin/academy-claims/${claimId}`);

  if (!result.ok) {
    redirect(detailHref(claimId, { error: result.error, returnTo }));
  }
  if (result.notification) {
    await queueClaimRejectedEmail(result.notification).catch(() => undefined);
  }

  redirect(detailHref(claimId, { decision: "rejected", returnTo }));
}
