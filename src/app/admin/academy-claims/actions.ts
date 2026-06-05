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

export async function approveAcademyClaim(claimId: string) {
  const user = await requireClaimReviewer();
  const result = await approveClaim(claimId, user.id);
  revalidatePath("/admin/academy-claims");
  revalidatePath(`/admin/academy-claims/${claimId}`);

  if (!result.ok) {
    redirect(detailHref(claimId, { error: result.error }));
  }
  if (result.user) {
    await queueClaimApprovedEmail(result.user).catch(() => undefined);
  }

  redirect(detailHref(claimId, { decision: "approved" }));
}

export async function rejectAcademyClaim(claimId: string, formData: FormData) {
  const user = await requireClaimReviewer();
  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();
  if (!rejectionReason) {
    redirect(detailHref(claimId, { error: "Rejection reason is required." }));
  }

  const result = await rejectClaim(claimId, user.id, rejectionReason);
  revalidatePath("/admin/academy-claims");
  revalidatePath(`/admin/academy-claims/${claimId}`);

  if (!result.ok) {
    redirect(detailHref(claimId, { error: result.error }));
  }
  if (result.notification) {
    await queueClaimRejectedEmail(result.notification).catch(() => undefined);
  }

  redirect(detailHref(claimId, { decision: "rejected" }));
}
