import { ClaimStatus } from "@prisma/client";
import { z } from "zod";
import { getAcademyFromAcademyService, addAcademyMemberInAcademyService, listAcademyMembersFromAcademyService } from "@/lib/academyService";
import { getAcademyClaim, updateAcademyClaimDecision, type AcademyClaimRecord } from "@/lib/academy-domain-data";
import { prisma } from "@/lib/prisma";
import { queuePasswordResetEmail } from "@/lib/password-reset";
import { queueEmail, sendQueuedEmail } from "@/lib/reliable-email";
import { replaceUserAuthorisationRole } from "@/lib/authorisation-service";

export function zodFieldErrors(error: z.ZodError) {
  return error.issues.reduce<Record<string, string[]>>((fieldErrors, issue) => {
    const key = issue.path[0]?.toString() || "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    return fieldErrors;
  }, {});
}

export function nullableString(value?: string | null) {
  return value && value.trim() ? value.trim() : null;
}

export function publicClaimResponse(claim: Pick<AcademyClaimRecord, "id" | "academyId" | "status" | "createdAt">) {
  return {
    id: claim.id,
    academyId: claim.academyId,
    status: claim.status,
    createdAt: claim.createdAt.toISOString(),
  };
}

export function isDuplicatePendingClaimError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function isAcademyManaged(academyId: string) {
  const members = await listAcademyMembersFromAcademyService(academyId);
  return members.length > 0;
}

async function linkRequesterUser(claim: AcademyClaimRecord) {
  const user = {
    id: claim.linkedUserId ?? claim.requesterEmail.toLowerCase(),
    name: claim.requesterName,
    email: claim.requesterEmail,
  };
  return { user, createdUser: false };
}

export type ClaimDecisionResult =
  | {
      ok: true;
      claim: Pick<AcademyClaimRecord, "id" | "academyId" | "status" | "reviewedAt" | "linkedUserId" | "rejectionReason">;
      user?: { id: string; email: string; name?: string | null };
      createdUser?: boolean;
      notification?: { requesterEmail: string; requesterName: string; academyName: string };
    }
  | { ok: false; status: 404 | 409; error: string };

export async function approveAcademyClaim(claimId: string, actorUserId: string): Promise<ClaimDecisionResult> {
  const existingClaim = await getAcademyClaim(claimId);
  if (!existingClaim) return { ok: false, status: 404, error: "Claim not found" };
  if (existingClaim.status !== ClaimStatus.PENDING) return { ok: false, status: 409, error: "Only pending claims can be approved" };
  if (await isAcademyManaged(existingClaim.academyId)) return { ok: false, status: 409, error: "Academy is already managed" };

  const result: ClaimDecisionResult = await prisma.$transaction(async (tx) => {
    const claim = await getAcademyClaim(claimId);
    const academy = claim ? await getAcademyFromAcademyService(claim.academyId) : null;
    if (!claim || !academy) return { ok: false as const, status: 404, error: "Claim not found" };
    if (claim.status !== ClaimStatus.PENDING) return { ok: false as const, status: 409, error: "Only pending claims can be approved" };
    const { user, createdUser } = await linkRequesterUser(claim);

    const updatedClaim = await updateAcademyClaimDecision({
      id: claim.id,
      status: ClaimStatus.APPROVED,
      reviewedById: actorUserId,
      linkedUserId: user.id,
    });
    if (!updatedClaim) return { ok: false as const, status: 404, error: "Claim not found" };

    await tx.adminAuditLog.create({
      data: {
        actorUserId,
        targetUserId: user.id,
        action: "ACADEMY_CLAIM_APPROVED",
        metadata: {
          claimId: claim.id,
          academyId: claim.academyId,
          academyName: academy.name,
          requesterEmail: claim.requesterEmail,
          requesterRole: claim.requesterRole,
          linkedUserId: user.id,
          createdUser,
        },
      },
    });

    return { ok: true as const, claim: updatedClaim, user, createdUser };
  });
  if (result.ok === true && result.user) {
    await addAcademyMemberInAcademyService(result.claim.academyId, result.user.id);
    await replaceUserAuthorisationRole({ id: actorUserId }, result.user.id, "ACADEMY_ADMIN", { organisationId: result.claim.academyId });
  }
  return result;
}

export async function rejectAcademyClaim(claimId: string, actorUserId: string, rejectionReason?: string | null): Promise<ClaimDecisionResult> {
  return prisma.$transaction(async (tx) => {
    const claim = await getAcademyClaim(claimId);
    const academy = claim ? await getAcademyFromAcademyService(claim.academyId) : null;

    if (!claim || !academy) return { ok: false, status: 404, error: "Claim not found" };
    if (claim.status !== ClaimStatus.PENDING) return { ok: false, status: 409, error: "Only pending claims can be rejected" };

    const updatedClaim = await updateAcademyClaimDecision({
      id: claim.id,
      status: ClaimStatus.REJECTED,
      reviewedById: actorUserId,
      rejectionReason: rejectionReason ?? null,
    });
    if (!updatedClaim) return { ok: false, status: 404, error: "Claim not found" };

    await tx.adminAuditLog.create({
      data: {
        actorUserId,
        action: "ACADEMY_CLAIM_REJECTED",
        metadata: {
          claimId: claim.id,
          academyId: claim.academyId,
          academyName: academy.name,
          requesterEmail: claim.requesterEmail,
          requesterRole: claim.requesterRole,
          rejectionReason: rejectionReason ?? null,
        },
      },
    });

    return {
      ok: true,
      claim: updatedClaim,
      notification: {
        requesterEmail: claim.requesterEmail,
        requesterName: claim.requesterName,
        academyName: academy.name,
      },
    };
  });
}

export async function queueClaimApprovedEmail(user: { id: string; email: string; name?: string | null }) {
  await queuePasswordResetEmail(user);
}

export async function queueClaimRejectedEmail(claim: { requesterEmail: string; requesterName: string; academyName: string }) {
  const outboundEmail = await queueEmail({
    to: claim.requesterEmail,
    subject: "RollFinders academy claim update",
    text: `Hi ${claim.requesterName},\n\nYour claim for ${claim.academyName} was not approved at this time.\n\nRollFinders`,
    html: `<p>Hi ${claim.requesterName},</p><p>Your claim for ${claim.academyName} was not approved at this time.</p><p>RollFinders</p>`,
  });
  await sendQueuedEmail(outboundEmail.id);
}
