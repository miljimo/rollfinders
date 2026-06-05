import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { AcademyMemberRole, ClaimStatus, Role, UserStatus, type ClaimRequest, type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { queuePasswordResetEmail } from "@/lib/password-reset";
import { queueEmail } from "@/lib/reliable-email";

type ClaimWithAcademy = ClaimRequest & {
  academy: { id: string; name: string; slug: string; city: string; postcode: string };
};

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

export function publicClaimResponse(claim: Pick<ClaimRequest, "id" | "academyId" | "status" | "createdAt">) {
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

export async function isAcademyManaged(academyId: string, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const memberCount = await tx.academyMember.count({ where: { academyId } });
  return memberCount > 0;
}

function isElevatedRole(role: Role) {
  return role === Role.PLATFORM_ADMIN || role === Role.SUPER_ADMIN || role === Role.ADMIN;
}

async function createRequesterUser(tx: Prisma.TransactionClient, claim: ClaimWithAcademy) {
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const user = await tx.user.create({
    data: {
      name: claim.requesterName,
      email: claim.requesterEmail,
      passwordHash,
      role: Role.ACADEMY_ADMIN,
      academyId: claim.academyId,
      status: UserStatus.ACTIVE,
    },
    select: { id: true, name: true, email: true, role: true, academyId: true },
  });

  return { user, createdUser: true };
}

async function linkRequesterUser(tx: Prisma.TransactionClient, claim: ClaimWithAcademy) {
  const existing = await tx.user.findUnique({
    where: { email: claim.requesterEmail },
    select: { id: true, name: true, email: true, role: true, academyId: true },
  });

  if (!existing) return createRequesterUser(tx, claim);
  if (isElevatedRole(existing.role)) return { user: existing, createdUser: false };

  const user = await tx.user.update({
    where: { id: existing.id },
    data: {
      name: existing.name ?? claim.requesterName,
      role: Role.ACADEMY_ADMIN,
      academyId: claim.academyId,
      status: UserStatus.ACTIVE,
      disabled: false,
    },
    select: { id: true, name: true, email: true, role: true, academyId: true },
  });

  return { user, createdUser: false };
}

export type ClaimDecisionResult =
  | {
      ok: true;
      claim: Pick<ClaimRequest, "id" | "academyId" | "status" | "reviewedAt" | "linkedUserId" | "rejectionReason">;
      user?: { id: string; email: string; name?: string | null };
      createdUser?: boolean;
      notification?: { requesterEmail: string; requesterName: string; academyName: string };
    }
  | { ok: false; status: 404 | 409; error: string };

export async function approveAcademyClaim(claimId: string, actorUserId: string): Promise<ClaimDecisionResult> {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.claimRequest.findUnique({
      where: { id: claimId },
      include: { academy: { select: { id: true, name: true, slug: true, city: true, postcode: true } } },
    });

    if (!claim) return { ok: false, status: 404, error: "Claim not found" };
    if (claim.status !== ClaimStatus.PENDING) return { ok: false, status: 409, error: "Only pending claims can be approved" };
    if (await isAcademyManaged(claim.academyId, tx)) return { ok: false, status: 409, error: "Academy is already managed" };

    const { user, createdUser } = await linkRequesterUser(tx, claim);
    await tx.academyMember.upsert({
      where: { academyId_userId: { academyId: claim.academyId, userId: user.id } },
      update: { role: AcademyMemberRole.ADMIN },
      create: { academyId: claim.academyId, userId: user.id, role: AcademyMemberRole.ADMIN },
    });

    const reviewedAt = new Date();
    const updatedClaim = await tx.claimRequest.update({
      where: { id: claim.id },
      data: {
        status: ClaimStatus.APPROVED,
        reviewedAt,
        reviewedById: actorUserId,
        linkedUserId: user.id,
      },
      select: { id: true, academyId: true, status: true, reviewedAt: true, linkedUserId: true, rejectionReason: true },
    });

    await tx.adminAuditLog.create({
      data: {
        actorUserId,
        targetUserId: user.id,
        action: "ACADEMY_CLAIM_APPROVED",
        metadata: {
          claimId: claim.id,
          academyId: claim.academyId,
          academyName: claim.academy.name,
          requesterEmail: claim.requesterEmail,
          requesterRole: claim.requesterRole,
          linkedUserId: user.id,
          createdUser,
        },
      },
    });

    return { ok: true, claim: updatedClaim, user, createdUser };
  });
}

export async function rejectAcademyClaim(claimId: string, actorUserId: string, rejectionReason?: string | null): Promise<ClaimDecisionResult> {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.claimRequest.findUnique({
      where: { id: claimId },
      include: { academy: { select: { id: true, name: true, slug: true, city: true, postcode: true } } },
    });

    if (!claim) return { ok: false, status: 404, error: "Claim not found" };
    if (claim.status !== ClaimStatus.PENDING) return { ok: false, status: 409, error: "Only pending claims can be rejected" };

    const reviewedAt = new Date();
    const updatedClaim = await tx.claimRequest.update({
      where: { id: claim.id },
      data: {
        status: ClaimStatus.REJECTED,
        reviewedAt,
        reviewedById: actorUserId,
        rejectionReason: rejectionReason ?? null,
      },
      select: { id: true, academyId: true, status: true, reviewedAt: true, linkedUserId: true, rejectionReason: true },
    });

    await tx.adminAuditLog.create({
      data: {
        actorUserId,
        action: "ACADEMY_CLAIM_REJECTED",
        metadata: {
          claimId: claim.id,
          academyId: claim.academyId,
          academyName: claim.academy.name,
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
        academyName: claim.academy.name,
      },
    };
  });
}

export async function queueClaimApprovedEmail(user: { id: string; email: string; name?: string | null }) {
  await queuePasswordResetEmail(user);
}

export async function queueClaimRejectedEmail(claim: { requesterEmail: string; requesterName: string; academyName: string }) {
  await queueEmail({
    to: claim.requesterEmail,
    subject: "RollFinders academy claim update",
    text: `Hi ${claim.requesterName},\n\nYour claim for ${claim.academyName} was not approved at this time.\n\nRollFinders`,
    html: `<p>Hi ${claim.requesterName},</p><p>Your claim for ${claim.academyName} was not approved at this time.</p><p>RollFinders</p>`,
  });
}
