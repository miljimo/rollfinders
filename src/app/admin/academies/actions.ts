"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AcademyMemberRole, InvitationStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { getCurrentUser, requireAdminPage } from "@/lib/admin";
import { requireAcademyEditor, requireAcademyOwner } from "@/lib/academy-access";
import { prisma } from "@/lib/prisma";
import { queueEmail } from "@/lib/reliable-email";
import { academySchema } from "@/lib/validators";

export type AcademyFormState = {
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
  values: Record<string, string>;
};

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
  return prisma.academy.findFirst({
    where: {
      ...(id ? { id: { not: id } } : {}),
      name: { equals: name.trim(), mode: "insensitive" },
      address: { equals: address.trim(), mode: "insensitive" },
      postcode: { equals: postcode.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
}

export async function createAcademy(_state: AcademyFormState, formData: FormData): Promise<AcademyFormState> {
  await requireAdminPage();

  const parsed = academySchema.safeParse(getFormValues(formData));
  if (!parsed.success) {
    return validationError(formData, parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;
  const duplicateAcademy = await findDuplicateAcademy(data);
  if (duplicateAcademy) {
    return duplicateAcademyError(formData);
  }

  try {
    await prisma.academy.create({
      data: {
        ...data,
        borough: toNullable(data.borough),
        website: toNullable(data.website),
        email: toNullable(data.email),
        logoUrl: toNullable(data.logoUrl),
        dropInPrice: toNullableNumber(data.dropInPrice),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return duplicateSlugError(formData);
    }
    throw error;
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateAcademy(
  id: string,
  _state: AcademyFormState,
  formData: FormData,
): Promise<AcademyFormState> {
  await requireAcademyEditor(id);

  const parsed = academySchema.safeParse(getFormValues(formData));
  if (!parsed.success) {
    return validationError(formData, parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;
  const duplicateAcademy = await findDuplicateAcademy({ id, ...data });
  if (duplicateAcademy) {
    return duplicateAcademyError(formData);
  }

  try {
    await prisma.academy.update({
      where: { id },
      data: {
        ...data,
        borough: toNullable(data.borough),
        website: toNullable(data.website),
        email: toNullable(data.email),
        logoUrl: toNullable(data.logoUrl),
        dropInPrice: toNullableNumber(data.dropInPrice),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return duplicateSlugError(formData);
    }
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/academies/${id}`);
  redirect("/admin");
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
  await queueEmail({
    to: invitedEmail,
    subject: `You've been invited to manage ${academyName} on RollFinders`,
    text: `You've been invited to manage ${academyName} on RollFinders.\n\nAccept the invitation here: ${url}`,
    html: `<p>You've been invited to manage <strong>${escapeHtml(academyName)}</strong> on RollFinders.</p><p><a href="${url}">Accept the invitation</a></p>`,
  });
}

export async function inviteAcademyAdmin(academyId: string, formData: FormData) {
  const access = await requireAcademyOwner(academyId);
  const invitedEmail = String(formData.get("invitedEmail") ?? "").trim().toLowerCase();
  if (!invitedEmail || !invitedEmail.includes("@")) redirect(`/admin/academies/${academyId}/team?error=invalid-email`);

  const invitation = await prisma.academyInvitation.create({
    data: {
      academyId,
      invitedEmail,
      invitedById: access.userId,
      token: invitationToken(),
      expiresAt: invitationExpiry(),
    },
    include: { academy: true },
  });
  await queueAcademyInvitationEmail({
    invitedEmail,
    academyName: invitation.academy.name,
    token: invitation.token,
  });

  revalidatePath(`/admin/academies/${academyId}/team`);
  redirect(`/admin/academies/${academyId}/team?invited=1`);
}

export async function cancelAcademyInvitation(academyId: string, invitationId: string) {
  await requireAcademyOwner(academyId);
  await prisma.academyInvitation.update({
    where: { id: invitationId, academyId },
    data: { status: InvitationStatus.CANCELLED },
  });
  revalidatePath(`/admin/academies/${academyId}/team`);
}

export async function resendAcademyInvitation(academyId: string, invitationId: string) {
  await requireAcademyOwner(academyId);
  const invitation = await prisma.academyInvitation.update({
    where: { id: invitationId, academyId },
    data: { token: invitationToken(), status: InvitationStatus.PENDING, expiresAt: invitationExpiry() },
    include: { academy: true },
  });
  await queueAcademyInvitationEmail({
    invitedEmail: invitation.invitedEmail,
    academyName: invitation.academy.name,
    token: invitation.token,
  });
  revalidatePath(`/admin/academies/${academyId}/team`);
}

export async function removeAcademyMember(academyId: string, memberId: string) {
  const access = await requireAcademyOwner(academyId);
  const member = await prisma.academyMember.findUnique({ where: { id: memberId } });
  if (!member || member.academyId !== academyId) return;
  if (!access.platformAdmin && member.role === AcademyMemberRole.OWNER) return;

  await prisma.academyMember.delete({ where: { id: memberId } });
  revalidatePath(`/admin/academies/${academyId}/team`);
}

export async function transferAcademyOwnership(academyId: string, memberId: string) {
  const access = await requireAcademyOwner(academyId);
  const nextOwner = await prisma.academyMember.findUnique({ where: { id: memberId } });
  if (!nextOwner || nextOwner.academyId !== academyId) return;

  await prisma.$transaction([
    prisma.academyMember.updateMany({
      where: { academyId, role: AcademyMemberRole.OWNER },
      data: { role: AcademyMemberRole.ADMIN },
    }),
    prisma.academyMember.update({
      where: { id: memberId },
      data: { role: AcademyMemberRole.OWNER },
    }),
  ]);

  if (!access.platformAdmin) redirect(`/admin/academies/${academyId}/team`);
  revalidatePath(`/admin/academies/${academyId}/team`);
}

export async function acceptAcademyInvitation(token: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login`);

  const invitation = await prisma.academyInvitation.findUnique({ where: { token } });
  if (!invitation || invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
    redirect("/admin?error=invalid-invitation");
  }
  if (invitation.invitedEmail.toLowerCase() !== user.email.toLowerCase()) {
    redirect("/admin?error=wrong-invitation-user");
  }

  await prisma.$transaction([
    prisma.academyMember.upsert({
      where: { academyId_userId: { academyId: invitation.academyId, userId: user.id } },
      update: { role: AcademyMemberRole.ADMIN },
      create: { academyId: invitation.academyId, userId: user.id, role: AcademyMemberRole.ADMIN },
    }),
    prisma.academyInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.ACCEPTED },
    }),
  ]);

  redirect(`/admin/academies/${invitation.academyId}`);
}
