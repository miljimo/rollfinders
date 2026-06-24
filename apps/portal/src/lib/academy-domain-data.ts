import { randomUUID } from "crypto";
import { ClaimRequesterRole, ClaimStatus, InvitationStatus, Prisma, type BjjBeltRank } from "@prisma/client";
import { getAcademyFromAcademyService, listAllAcademiesFromAcademyService } from "./academyService";
import { prisma } from "./prisma";

if (typeof window !== "undefined") {
  throw new Error("Academy domain data calls are server-only.");
}

type AcademyClaimStatus = "pending" | "approved" | "rejected" | "cancelled";
type AcademyInvitationStatus = "pending" | "accepted" | "cancelled" | "expired";

export type AcademyClaimRecord = {
  id: string;
  academyId: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  requesterRole: ClaimRequesterRole;
  requesterBeltRank: BjjBeltRank | null;
  requesterBeltStripes: number | null;
  verificationNotes: string;
  publicProofLink: string | null;
  status: ClaimStatus;
  reviewedAt: Date | null;
  reviewedById: string | null;
  rejectionReason: string | null;
  linkedUserId: string | null;
  createdAt: Date;
};

export type AcademyInvitationRecord = {
  id: string;
  academyId: string;
  invitedEmail: string;
  invitedById: string;
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
};

export type AcademyClaimReminderRecord = {
  id: string;
  academyId: string;
  actorUserId: string | null;
  recipientEmail: string | null;
  outboundEmailId: string | null;
  status: string;
  skipReason: string | null;
  source: string;
  createdAt: Date;
};

type AcademyClaimRow = {
  id: string;
  academy_id: string;
  claimant_user_id: string | null;
  claimant_email: string;
  status: AcademyClaimStatus;
  evidence: Record<string, unknown>;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | string | null;
  created_at: Date | string;
};

type AcademyInvitationRow = {
  id: string;
  academy_id: string;
  email: string;
  invited_by: string | null;
  token_hash: string;
  status: AcademyInvitationStatus;
  expires_at: Date | string;
  created_at: Date | string;
};

type AcademyClaimReminderRow = {
  id: string;
  academy_id: string;
  actor_user_id: string | null;
  recipient_email: string | null;
  outbound_email_id: string | null;
  status: string | null;
  skip_reason: string | null;
  source: string | null;
  created_at: Date | string;
};

function dateValue(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function stringEvidence(evidence: Record<string, unknown>, key: string) {
  const value = evidence[key];
  return typeof value === "string" ? value : "";
}

function nullableStringEvidence(evidence: Record<string, unknown>, key: string) {
  const value = stringEvidence(evidence, key);
  return value || null;
}

function numberEvidence(evidence: Record<string, unknown>, key: string) {
  const value = evidence[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function claimStatusFromAcademy(value: string): ClaimStatus {
  if (value === "approved") return ClaimStatus.APPROVED;
  if (value === "rejected") return ClaimStatus.REJECTED;
  return ClaimStatus.PENDING;
}

function claimStatusToAcademy(value: ClaimStatus): AcademyClaimStatus {
  if (value === ClaimStatus.APPROVED) return "approved";
  if (value === ClaimStatus.REJECTED) return "rejected";
  return "pending";
}

function invitationStatusFromAcademy(value: string): InvitationStatus {
  if (value === "accepted") return InvitationStatus.ACCEPTED;
  if (value === "cancelled") return InvitationStatus.CANCELLED;
  if (value === "expired") return InvitationStatus.EXPIRED;
  return InvitationStatus.PENDING;
}

function invitationStatusToAcademy(value: InvitationStatus): AcademyInvitationStatus {
  if (value === InvitationStatus.ACCEPTED) return "accepted";
  if (value === InvitationStatus.CANCELLED) return "cancelled";
  if (value === InvitationStatus.EXPIRED) return "expired";
  return "pending";
}

function claimFromRow(row: AcademyClaimRow): AcademyClaimRecord {
  const evidence = row.evidence ?? {};
  return {
    id: row.id,
    academyId: row.academy_id,
    requesterName: stringEvidence(evidence, "requesterName"),
    requesterEmail: row.claimant_email,
    requesterPhone: nullableStringEvidence(evidence, "requesterPhone"),
    requesterRole: stringEvidence(evidence, "requesterRole") as ClaimRequesterRole,
    requesterBeltRank: nullableStringEvidence(evidence, "requesterBeltRank") as BjjBeltRank | null,
    requesterBeltStripes: numberEvidence(evidence, "requesterBeltStripes"),
    verificationNotes: stringEvidence(evidence, "verificationNotes"),
    publicProofLink: nullableStringEvidence(evidence, "publicProofLink"),
    status: claimStatusFromAcademy(row.status),
    reviewedAt: dateValue(row.reviewed_at),
    reviewedById: row.reviewed_by,
    rejectionReason: row.review_notes,
    linkedUserId: row.claimant_user_id,
    createdAt: dateValue(row.created_at) ?? new Date(0),
  };
}

function invitationFromRow(row: AcademyInvitationRow): AcademyInvitationRecord {
  return {
    id: row.id,
    academyId: row.academy_id,
    invitedEmail: row.email,
    invitedById: row.invited_by ?? "",
    token: row.token_hash,
    status: invitationStatusFromAcademy(row.status),
    expiresAt: dateValue(row.expires_at) ?? new Date(0),
    createdAt: dateValue(row.created_at) ?? new Date(0),
  };
}

function reminderFromRow(row: AcademyClaimReminderRow): AcademyClaimReminderRecord {
  return {
    id: row.id,
    academyId: row.academy_id,
    actorUserId: row.actor_user_id,
    recipientEmail: row.recipient_email,
    outboundEmailId: row.outbound_email_id,
    status: row.status ?? "QUEUED",
    skipReason: row.skip_reason,
    source: row.source ?? "admin_academies",
    createdAt: dateValue(row.created_at) ?? new Date(0),
  };
}

export async function findPendingAcademyClaim(academyId: string, requesterEmail: string) {
  const rows = await prisma.$queryRaw<AcademyClaimRow[]>`
    SELECT *
    FROM academy.academy_claims
    WHERE academy_id = ${academyId}
      AND lower(claimant_email) = lower(${requesterEmail})
      AND status = 'pending'::academy.academy_claim_status
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ? claimFromRow(rows[0]) : null;
}

export async function createAcademyClaim(input: {
  academyId: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string | null;
  requesterRole: ClaimRequesterRole;
  requesterBeltRank?: BjjBeltRank | null;
  requesterBeltStripes?: number | null;
  verificationNotes: string;
  publicProofLink?: string | null;
}) {
  const id = randomUUID();
  const evidence = {
    requesterName: input.requesterName,
    requesterPhone: input.requesterPhone ?? null,
    requesterRole: input.requesterRole,
    requesterBeltRank: input.requesterBeltRank ?? null,
    requesterBeltStripes: input.requesterBeltStripes ?? null,
    verificationNotes: input.verificationNotes,
    publicProofLink: input.publicProofLink ?? null,
  };
  const rows = await prisma.$queryRaw<AcademyClaimRow[]>`
    INSERT INTO academy.academy_claims (
      id,
      academy_id,
      claimant_email,
      status,
      evidence,
      created_at,
      updated_at
    )
    VALUES (
      ${id},
      ${input.academyId},
      ${input.requesterEmail},
      'pending'::academy.academy_claim_status,
      ${JSON.stringify(evidence)}::jsonb,
      now(),
      now()
    )
    RETURNING *
  `;
  return claimFromRow(rows[0]);
}

export async function getAcademyClaim(id: string) {
  const rows = await prisma.$queryRaw<AcademyClaimRow[]>`
    SELECT *
    FROM academy.academy_claims
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? claimFromRow(rows[0]) : null;
}

export async function updateAcademyClaimDecision(input: {
  id: string;
  status: ClaimStatus;
  reviewedById: string;
  linkedUserId?: string | null;
  rejectionReason?: string | null;
}) {
  const rows = await prisma.$queryRaw<AcademyClaimRow[]>`
    UPDATE academy.academy_claims
    SET status = ${claimStatusToAcademy(input.status)}::academy.academy_claim_status,
        claimant_user_id = ${input.linkedUserId ?? null},
        reviewed_by = ${input.reviewedById},
        reviewed_at = now(),
        review_notes = ${input.rejectionReason ?? null},
        updated_at = now()
    WHERE id = ${input.id}
    RETURNING *
  `;
  return rows[0] ? claimFromRow(rows[0]) : null;
}

export async function listAcademyClaims({
  page = 1,
  pageSize = 20,
  search = "",
  status,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ClaimStatus | null;
}) {
  const rows = await prisma.$queryRaw<AcademyClaimRow[]>`
    SELECT *
    FROM academy.academy_claims
    ORDER BY created_at DESC
  `;
  const academies = await listAllAcademiesFromAcademyService();
  const academyById = new Map(academies.map((academy) => [academy.id, academy]));
  const value = search.trim().toLowerCase();
  const filtered = rows
    .map(claimFromRow)
    .filter((claim) => !status || claim.status === status)
    .filter((claim) => {
      if (!value) return true;
      const academy = academyById.get(claim.academyId);
      return [
        claim.requesterName,
        claim.requesterEmail,
        academy?.name ?? "",
      ].some((field) => field.toLowerCase().includes(value));
    });
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  return {
    claims: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    academyById,
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
  };
}

export async function listPendingAcademyInvitations(academyId: string) {
  const rows = await prisma.$queryRaw<AcademyInvitationRow[]>`
    SELECT *
    FROM academy.academy_invitations
    WHERE academy_id = ${academyId}
      AND status = 'pending'::academy.academy_invitation_status
    ORDER BY created_at DESC
  `;
  return rows.map(invitationFromRow);
}

export async function createAcademyInvitation(input: {
  academyId: string;
  invitedEmail: string;
  invitedById: string;
  token: string;
  expiresAt: Date;
}) {
  const rows = await prisma.$queryRaw<AcademyInvitationRow[]>`
    INSERT INTO academy.academy_invitations (
      id,
      academy_id,
      email,
      invited_by,
      token_hash,
      status,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (
      ${randomUUID()},
      ${input.academyId},
      ${input.invitedEmail},
      ${input.invitedById},
      ${input.token},
      'pending'::academy.academy_invitation_status,
      ${input.expiresAt},
      now(),
      now()
    )
    RETURNING *
  `;
  return invitationFromRow(rows[0]);
}

export async function updateAcademyInvitationStatus(id: string, academyId: string, status: InvitationStatus) {
  await prisma.$executeRaw`
    UPDATE academy.academy_invitations
    SET status = ${invitationStatusToAcademy(status)}::academy.academy_invitation_status,
        updated_at = now()
    WHERE id = ${id}
      AND academy_id = ${academyId}
  `;
}

export async function resendAcademyInvitationRecord(id: string, academyId: string, token: string, expiresAt: Date) {
  const rows = await prisma.$queryRaw<AcademyInvitationRow[]>`
    UPDATE academy.academy_invitations
    SET token_hash = ${token},
        status = 'pending'::academy.academy_invitation_status,
        expires_at = ${expiresAt},
        updated_at = now()
    WHERE id = ${id}
      AND academy_id = ${academyId}
    RETURNING *
  `;
  return rows[0] ? invitationFromRow(rows[0]) : null;
}

export async function findAcademyInvitationByToken(token: string) {
  const rows = await prisma.$queryRaw<AcademyInvitationRow[]>`
    SELECT *
    FROM academy.academy_invitations
    WHERE token_hash = ${token}
    LIMIT 1
  `;
  return rows[0] ? invitationFromRow(rows[0]) : null;
}

export async function acceptAcademyInvitationRecord(id: string, acceptedBy: string) {
  await prisma.$executeRaw`
    UPDATE academy.academy_invitations
    SET status = 'accepted'::academy.academy_invitation_status,
        accepted_by = ${acceptedBy},
        accepted_at = now(),
        updated_at = now()
    WHERE id = ${id}
  `;
}

export async function createAcademyClaimReminder(input: {
  academyId: string;
  actorUserId: string;
  recipientEmail?: string | null;
  outboundEmailId?: string | null;
  status: string;
  skipReason?: string | null;
  source: string;
}) {
  await prisma.$executeRaw`
    INSERT INTO academy.academy_claim_reminders (
      id,
      academy_id,
      recipient_email,
      sent_by,
      actor_user_id,
      outbound_email_id,
      status,
      skip_reason,
      source,
      sent_at,
      created_at
    )
    VALUES (
      ${randomUUID()},
      ${input.academyId},
      ${input.recipientEmail ?? null},
      ${input.actorUserId},
      ${input.actorUserId},
      ${input.outboundEmailId ?? null},
      ${input.status},
      ${input.skipReason ?? null},
      ${input.source},
      now(),
      now()
    )
  `;
}

export async function findRecentQueuedAcademyClaimReminder(academyId: string, recipientEmail: string, since: Date) {
  const rows = await prisma.$queryRaw<AcademyClaimReminderRow[]>`
    SELECT *
    FROM academy.academy_claim_reminders
    WHERE academy_id = ${academyId}
      AND lower(recipient_email) = lower(${recipientEmail})
      AND status = 'QUEUED'
      AND created_at >= ${since}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ? reminderFromRow(rows[0]) : null;
}

export async function listAcademyClaimReminders(academyIds: string[]) {
  if (!academyIds.length) return [];
  const rows = await prisma.$queryRaw<AcademyClaimReminderRow[]>`
    SELECT *
    FROM academy.academy_claim_reminders
    WHERE academy_id IN (${Prisma.join(academyIds)})
    ORDER BY created_at DESC
  `;
  return rows.map(reminderFromRow);
}

export async function academyClaimStatuses(academyId: string) {
  const rows = await prisma.$queryRaw<Array<{ status: AcademyClaimStatus }>>`
    SELECT status
    FROM academy.academy_claims
    WHERE academy_id = ${academyId}
  `;
  return rows.map((row) => ({ status: claimStatusFromAcademy(row.status) }));
}
