"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AcademyVerificationStatus, ClaimStatus, InvitationStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole, writeAdminAuditLog } from "@/lib/admin";
import { requireAcademyEditor, requireAcademyOwner } from "@/lib/academy-access";
import { AcademyServiceError, addAcademyMemberInAcademyService, createAcademyInAcademyService, getAcademyFromAcademyService, listAcademyMembersFromAcademyService, listAcademiesForActorFromAcademyService, removeAcademyMemberInAcademyService, updateAcademyInAcademyService } from "@/lib/academyService";
import {
  acceptAcademyInvitationRecord,
  academyClaimStatuses,
  createAcademyClaimReminder,
  createAcademyInvitation,
  findAcademyInvitationByToken,
  findRecentQueuedAcademyClaimReminder,
  resendAcademyInvitationRecord,
  updateAcademyInvitationStatus,
} from "@/lib/academy-domain-data";
import { replaceUserAuthorisationRole } from "@/lib/authorisation-service";
import { legacySocialUrlsFromLinks, parseAcademySocialLinksJson, socialLinksFromLegacy, type AcademySocialLinkInput } from "@/lib/academy-social-links";
import { claimReminderCooldownDays } from "@/lib/academy-claim-reminders";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { renderAcademyClaimInvitationEmail } from "@/lib/email/academy-claim-invitation";
import { recordAcademyCreatedActivity } from "@/lib/platform-admin-activity";
import { prisma } from "@/lib/prisma";
import { queueEmail, sendQueuedEmail } from "@/lib/reliable-email";
import { academySchema } from "@/lib/validators";

const claimReminderBatchLimit = 50;

export type AcademyFormState = {
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
  values: Record<string, string>;
};

type ClaimInvitationSource = "admin_academies" | "academy_creation";

function getFormValues(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries())
      .filter(([key]) => !key.startsWith("$ACTION_"))
      .map(([key, value]) => [key, String(value)]),
  );
}

function toNullable(value: string | null | undefined) {
  return value ? value : null;
}

function toNullableNumber(value: number | "" | undefined) {
  return value === "" || value === undefined ? null : value;
}

function baseAcademyData(data: ReturnType<typeof academySchema.parse>, socialLinks: AcademySocialLinkInput[]) {
  const legacySocialUrls = legacySocialUrlsFromLinks(socialLinks);
  return {
    name: data.name,
    slug: data.slug,
    description: data.description,
    affiliation: data.affiliation,
    address: data.address,
    city: data.city,
    postcode: data.postcode,
    country: data.country,
    latitude: data.latitude,
    longitude: data.longitude,
    phone: data.phone,
    giAvailable: data.giAvailable,
    nogiAvailable: data.nogiAvailable,
    beginnerFriendly: data.beginnerFriendly,
    competitionFocused: data.competitionFocused,
    verificationStatus: data.verificationStatus,
    featured: data.featured,
    borough: toNullable(data.borough),
    website: toNullable(data.website),
    email: toNullable(data.email),
    logoUrl: toNullable(data.logoUrl),
    coverImageUrl: toNullable(data.coverImageUrl),
    categories: toNullable(data.categories),
    facebookUrl: toNullable(legacySocialUrls.facebookUrl || data.facebookUrl),
    instagramUrl: toNullable(legacySocialUrls.instagramUrl || data.instagramUrl),
    xUrl: toNullable(legacySocialUrls.xUrl || data.xUrl),
    dropInPrice: toNullableNumber(data.dropInPrice),
    socialLinks,
  };
}

function socialLinksForSubmission(data: ReturnType<typeof academySchema.parse>, formData: FormData) {
  const submitted = formData.get("socialLinksJson");
  const parsed = parseAcademySocialLinksJson(submitted);
  if (parsed.error) return parsed;
  if (parsed.links.length > 0) return parsed;
  if (submitted !== null) return { links: [] };
  return { links: socialLinksFromLegacy(data) };
}

function validationError(formData: FormData, fieldErrors: Record<string, string[] | undefined>): AcademyFormState {
  return {
    message: "Please fix the highlighted fields and try again.",
    fieldErrors,
    values: getFormValues(formData),
  };
}

function duplicateSlugError(formData: FormData): AcademyFormState {
  return {
    message: "An academy with this slug already exists.",
    fieldErrors: { slug: ["Use a unique slug for this academy."] },
    values: getFormValues(formData),
  };
}

function duplicateAcademyError(formData: FormData): AcademyFormState {
  return {
    message: "An academy with this name, address, and postcode already exists.",
    fieldErrors: {
      name: ["Check the existing academy before creating a duplicate."],
      address: ["This address is already used by an academy with the same name."],
      postcode: ["This postcode is already used by an academy with the same name."],
    },
    values: getFormValues(formData),
  };
}

function academyServiceFormError(formData: FormData, error: AcademyServiceError): AcademyFormState {
  return {
    message: error.status === 401 || error.status === 403
      ? "You are not authorised to change this academy."
      : error.message || "Academy request could not be completed.",
    fieldErrors: {},
    values: getFormValues(formData),
  };
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function findDuplicateAcademy({
  id,
  name,
  address,
  postcode,
}: {
  id?: string;
  name: string;
  address: string;
  postcode: string;
}) {
  const normalized = { name: name.trim().toLowerCase(), address: address.trim().toLowerCase(), postcode: postcode.trim().toLowerCase() };
  return (await listAcademiesForActorFromAcademyService({ id: "__system__", role: "SUPER_ADMIN" })).find((academy) =>
    academy.id !== id
    && academy.name.trim().toLowerCase() === normalized.name
    && academy.address.trim().toLowerCase() === normalized.address
    && academy.postcode.trim().toLowerCase() === normalized.postcode,
  );
}

export async function createAcademy(_state: AcademyFormState, formData: FormData): Promise<AcademyFormState> {
  const actor = await getCurrentUser();
  if (!isPlatformAdminRole(actor?.role)) redirect("/");

  const parsed = academySchema.safeParse(getFormValues(formData));
  if (!parsed.success) {
    return validationError(formData, parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;
  const socialLinksResult = socialLinksForSubmission(data, formData);
  if (socialLinksResult.error) {
    return validationError(formData, { socialLinksJson: [socialLinksResult.error] });
  }
  const socialLinks = socialLinksResult.links;
  const duplicateAcademy = await findDuplicateAcademy(data);
  if (duplicateAcademy) {
    return duplicateAcademyError(formData);
  }

  let academy: { id: string; name: string };
  try {
    academy = await createAcademyInAcademyService({
      ...baseAcademyData(data, socialLinks),
      verified: data.verificationStatus === AcademyVerificationStatus.VERIFIED,
      createdById: actor.id,
    }, actor);
    if (actor) {
      await writeAdminAuditLog({
        actorUserId: actor.id,
        action: "ACADEMY_CREATED",
        metadata: { academyId: academy.id, academyName: academy.name },
      });

      await recordAcademyCreatedActivity(actor.id, academy.id);
      await recordAnalyticsEventBestEffort({
        eventName: "academy_created",
        academyId: academy.id,
        source: "admin_academies",
        metadata: {
          actorUserId: actor.id,
          academyName: academy.name,
        },
      });
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return duplicateSlugError(formData);
    }
    if (error instanceof AcademyServiceError) {
      return academyServiceFormError(formData, error);
    }
    throw error;
  }

  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const url = new URL(returnTo.startsWith("/admin") || returnTo.startsWith("/dashboard/academies") || returnTo.startsWith("/dashboard?panel=academies") ? returnTo : "/admin?panel=academies", "http://localhost");
  if (shouldSendClaimInvitation(formData)) {
    const outcome = await safeSendReminderForAcademy(actor.id, academy.id, "academy_creation");
    url.searchParams.set("claimInvitationResult", outcome.status);
    url.searchParams.set("claimInvitationReason", outcome.status === "queued" ? "queued" : outcome.reason);
  } else {
    url.searchParams.set("claimInvitationResult", "not_sent");
  }
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(`${url.pathname}${url.search}`);
}

export async function updateAcademy(
  id: string,
  _state: AcademyFormState,
  formData: FormData,
): Promise<AcademyFormState> {
  await requireAcademyEditor(id);
  const actor = await getCurrentUser();

  const parsed = academySchema.safeParse(getFormValues(formData));
  if (!parsed.success) {
    return validationError(formData, parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;
  const socialLinksResult = socialLinksForSubmission(data, formData);
  if (socialLinksResult.error) {
    return validationError(formData, { socialLinksJson: [socialLinksResult.error] });
  }
  const socialLinks = socialLinksResult.links;
  const duplicateAcademy = await findDuplicateAcademy({ id, ...data });
  if (duplicateAcademy) {
    return duplicateAcademyError(formData);
  }

  const existingAcademy = isAcademyAdminRole(actor?.role)
    ? await getAcademyFromAcademyService(id, actor ?? undefined)
    : null;
  let academy: { id: string; name: string };
  try {
    const nextVerificationStatus = existingAcademy?.verificationStatus ?? data.verificationStatus;
    academy = await updateAcademyInAcademyService(id, {
      ...baseAcademyData(data, socialLinks),
      verificationStatus: nextVerificationStatus,
      featured: existingAcademy?.featured ?? data.featured,
      verified: nextVerificationStatus === AcademyVerificationStatus.VERIFIED,
    }, actor ?? undefined);
    if (actor) {
      await writeAdminAuditLog({
        actorUserId: actor.id,
        action: "ACADEMY_UPDATED",
        metadata: { academyId: academy.id, academyName: academy.name },
      });
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return duplicateSlugError(formData);
    }
    if (error instanceof AcademyServiceError) {
      return academyServiceFormError(formData, error);
    }
    throw error;
  }

  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const url = new URL(returnTo.startsWith("/admin?panel=academies") || returnTo.startsWith("/dashboard/academies") || returnTo.startsWith("/dashboard?panel=academies") ? returnTo : "/admin?panel=academies", "http://localhost");
  if (actor && isPlatformAdminRole(actor.role) && shouldSendClaimInvitation(formData)) {
    const outcome = await safeSendReminderForAcademy(actor.id, academy.id);
    url.searchParams.set("claimInvitationResult", outcome.status);
    url.searchParams.set("claimInvitationReason", outcome.status === "queued" ? "queued" : outcome.reason);
  } else if (shouldSendClaimInvitation(formData)) {
    url.searchParams.set("claimInvitationResult", "unauthorized");
  } else {
    url.searchParams.set("claimInvitationResult", "not_sent");
  }
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/admin/academies/${id}`);
  redirect(`${url.pathname}${url.search}`);
}

function invitationExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);
  return expiresAt;
}

function invitationToken() {
  return randomBytes(24).toString("hex");
}

function invitationUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/admin/invitations/${token}`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function publicClaimUrl(slug: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/academies/${slug}/claim`;
}

function publicAcademyUrl(slug: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/academies/${slug}`;
}

function reminderCooldownStart() {
  const date = new Date();
  date.setDate(date.getDate() - claimReminderCooldownDays);
  return date;
}

function adminAcademiesRedirect(formData: FormData, params: Record<string, string | number>) {
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const url = new URL(returnTo.startsWith("/admin") ? returnTo : "/admin?panel=academies", "http://localhost");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(`${url.pathname}${url.search}`);
}

function shouldSendClaimInvitation(formData: FormData) {
  return String(formData.get("sendClaimInvitation") ?? "off") === "on";
}

async function safeSendReminderForAcademy(actorUserId: string, academyId: string, source: ClaimInvitationSource = "admin_academies"): Promise<ReminderOutcome> {
  try {
    return await sendReminderForAcademy(actorUserId, academyId, source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Invitation could not be queued.";
    return { status: "failed", academyId, reason };
  }
}

async function queueAcademyClaimReminderEmail({
  academyName,
  academySlug,
  recipientEmail,
}: {
  academyName: string;
  academySlug: string;
  recipientEmail: string;
}) {
  const email = renderAcademyClaimInvitationEmail({
    academyName,
    academyProfileUrl: publicAcademyUrl(academySlug),
    claimInvitationUrl: publicClaimUrl(academySlug),
    recipientEmail,
    supportEmail: "support@rollfinders.com",
    currentYear: String(new Date().getFullYear()),
  });

  const outboundEmail = await queueEmail({
    to: recipientEmail,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
  await sendQueuedEmail(outboundEmail.id);
  return outboundEmail;
}

type ReminderOutcome =
  | { status: "queued"; academyId: string; email: string; outboundEmailId: string }
  | { status: "skipped"; academyId: string; reason: string; email?: string | null }
  | { status: "failed"; academyId: string; reason: string; email?: string | null };

async function createReminderAudit({
  actorUserId,
  academyId,
  academyName,
  email,
  outcome,
  reason,
  source,
}: {
  actorUserId: string;
  academyId: string;
  academyName?: string;
  email?: string | null;
  outcome: string;
  reason?: string | null;
  source: ClaimInvitationSource;
}) {
  await writeAdminAuditLog({
    actorUserId,
    action: "ACADEMY_CLAIM_REMINDER",
    metadata: {
      academyId,
      academyName,
      recipientEmail: email ?? null,
      outcome,
      reason: reason ?? null,
      source,
    },
  });
}

async function recordSkippedReminder(actorUserId: string, academyId: string, reason: string, email: string | null | undefined, academyName: string | undefined, source: ClaimInvitationSource) {
  await createAcademyClaimReminder({
    academyId,
    actorUserId,
    recipientEmail: email ?? null,
    status: "SKIPPED",
    skipReason: reason,
    source,
  });
  await createReminderAudit({ actorUserId, academyId, academyName, email, outcome: "skipped", reason, source });
  return { status: "skipped", academyId, reason, email } satisfies ReminderOutcome;
}

async function sendReminderForAcademy(actorUserId: string, academyId: string, source: ClaimInvitationSource = "admin_academies"): Promise<ReminderOutcome> {
  const [academy, claims, members] = await Promise.all([
    getAcademyFromAcademyService(academyId),
    academyClaimStatuses(academyId),
    listAcademyMembersFromAcademyService(academyId),
  ]);

  if (!academy) {
    await createReminderAudit({ actorUserId, academyId, outcome: "skipped", reason: "not_found", source });
    return { status: "skipped", academyId, reason: "not_found" };
  }
  const email = academy.email ? normalizeEmail(academy.email) : null;
  if (members.length > 0 || claims.some((claim) => claim.status === ClaimStatus.APPROVED)) {
    return recordSkippedReminder(actorUserId, academy.id, "managed", email, academy.name, source);
  }
  if (claims.some((claim) => claim.status === ClaimStatus.PENDING)) {
    return recordSkippedReminder(actorUserId, academy.id, "pending_claim", email, academy.name, source);
  }
  if (!email) return recordSkippedReminder(actorUserId, academy.id, "missing_email", null, academy.name, source);
  if (!isValidEmail(email)) return recordSkippedReminder(actorUserId, academy.id, "invalid_email", email, academy.name, source);
  const recentReminder = await findRecentQueuedAcademyClaimReminder(academy.id, email, reminderCooldownStart());
  if (recentReminder) return recordSkippedReminder(actorUserId, academy.id, "recently_sent", email, academy.name, source);

  try {
    const outboundEmail = await queueAcademyClaimReminderEmail({
      academyName: academy.name,
      academySlug: academy.slug,
      recipientEmail: email,
    });
    await createAcademyClaimReminder({
      academyId: academy.id,
      actorUserId,
      recipientEmail: email,
      outboundEmailId: outboundEmail.id,
      status: "QUEUED",
      source,
    });
    await createReminderAudit({ actorUserId, academyId: academy.id, academyName: academy.name, email, outcome: "queued", source });
    return { status: "queued", academyId: academy.id, email, outboundEmailId: outboundEmail.id };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Reminder could not be queued.";
    await createAcademyClaimReminder({
      academyId: academy.id,
      actorUserId,
      recipientEmail: email,
      status: "FAILED",
      skipReason: reason,
      source,
    });
    await createReminderAudit({ actorUserId, academyId: academy.id, academyName: academy.name, email, outcome: "failed", reason, source });
    return { status: "failed", academyId: academy.id, reason, email };
  }
}

async function queueAcademyInvitationEmail({
  invitedEmail,
  academyName,
  token,
}: {
  invitedEmail: string;
  academyName: string;
  token: string;
}) {
  const url = invitationUrl(token);
  const outboundEmail = await queueEmail({
    to: invitedEmail,
    subject: `You've been invited to manage ${academyName} on RollFinders`,
    text: `You've been invited to manage ${academyName} on RollFinders.\n\nAccept the invitation here: ${url}`,
    html: `<p>You've been invited to manage <strong>${escapeHtml(academyName)}</strong> on RollFinders.</p><p><a href="${url}">Accept the invitation</a></p>`,
  });
  await sendQueuedEmail(outboundEmail.id);
}

export async function inviteAcademyAdmin(academyId: string, formData: FormData) {
  const access = await requireAcademyOwner(academyId);
  const invitedEmail = String(formData.get("invitedEmail") ?? "").trim().toLowerCase();
  if (!invitedEmail || !invitedEmail.includes("@")) redirect(`/admin/academies/${academyId}/team?error=invalid-email`);

  const invitation = await createAcademyInvitation({
    academyId,
    invitedEmail,
    invitedById: access.userId,
    token: invitationToken(),
    expiresAt: invitationExpiry(),
  });
  const academy = await getAcademyFromAcademyService(academyId);
  await queueAcademyInvitationEmail({
    invitedEmail,
    academyName: academy?.name ?? "this academy",
    token: invitation.token,
  });

  revalidatePath(`/admin/academies/${academyId}/team`);
  redirect(`/admin/academies/${academyId}/team?invited=1`);
}

export async function cancelAcademyInvitation(academyId: string, invitationId: string) {
  await requireAcademyOwner(academyId);
  await updateAcademyInvitationStatus(invitationId, academyId, InvitationStatus.CANCELLED);
  revalidatePath(`/admin/academies/${academyId}/team`);
}

export async function resendAcademyInvitation(academyId: string, invitationId: string) {
  await requireAcademyOwner(academyId);
  const invitation = await resendAcademyInvitationRecord(invitationId, academyId, invitationToken(), invitationExpiry());
  if (!invitation) return;
  const academy = await getAcademyFromAcademyService(academyId);
  await queueAcademyInvitationEmail({
    invitedEmail: invitation.invitedEmail,
    academyName: academy?.name ?? "this academy",
    token: invitation.token,
  });
  revalidatePath(`/admin/academies/${academyId}/team`);
}

export async function sendAcademyClaimReminder(academyId: string, formData: FormData) {
  const actor = await getCurrentUser();
  if (!isPlatformAdminRole(actor?.role)) redirect("/admin?panel=academies&claimReminderResult=unauthorized");

  const outcome = await sendReminderForAcademy(actor.id, academyId);
  adminAcademiesRedirect(formData, {
    claimReminderResult: outcome.status,
    claimReminderReason: outcome.status === "queued" ? "queued" : outcome.reason,
  });
}

export async function sendBulkAcademyClaimReminders(formData: FormData) {
  const actor = await getCurrentUser();
  if (!isPlatformAdminRole(actor?.role)) redirect("/admin?panel=academies&claimReminderResult=unauthorized");

  const academyIds = formData.getAll("academyIds").map((value) => String(value)).filter(Boolean);
  if (!academyIds.length) {
    adminAcademiesRedirect(formData, { claimReminderResult: "none_selected" });
  }
  if (academyIds.length > claimReminderBatchLimit) {
    adminAcademiesRedirect(formData, { claimReminderResult: "batch_too_large" });
  }

  const outcomes = await Promise.all([...new Set(academyIds)].map((academyId) => sendReminderForAcademy(actor.id, academyId)));
  const queued = outcomes.filter((outcome) => outcome.status === "queued").length;
  const skipped = outcomes.filter((outcome) => outcome.status === "skipped").length;
  const failed = outcomes.filter((outcome) => outcome.status === "failed").length;
  adminAcademiesRedirect(formData, {
    claimReminderResult: "bulk",
    queued,
    skipped,
    failed,
  });
}

export async function removeAcademyMember(academyId: string, memberId: string) {
  await requireAcademyOwner(academyId);
  const member = (await listAcademyMembersFromAcademyService(academyId)).find((item) => item.id === memberId);
  if (!member || member.academyId !== academyId) return;

  await removeAcademyMemberInAcademyService(academyId, member.userId);
  revalidatePath(`/admin/academies/${academyId}/team`);
}

export async function acceptAcademyInvitation(token: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login`);

  const invitation = await findAcademyInvitationByToken(token);
  if (!invitation || invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
    redirect("/admin?error=invalid-invitation");
  }
  if (invitation.invitedEmail.toLowerCase() !== user.email.toLowerCase()) {
    redirect("/admin?error=wrong-invitation-user");
  }

  await addAcademyMemberInAcademyService(invitation.academyId, user.id);
  await acceptAcademyInvitationRecord(invitation.id, user.id);
  await replaceUserAuthorisationRole(user, user.id, "ACADEMY_ADMIN", { organisationId: invitation.academyId });

  redirect(`/admin/academies/${invitation.academyId}`);
}
