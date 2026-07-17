"use server";

import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import { AcademyVerificationStatus } from "@prisma/client";
import {
  AcademyServiceError,
  createPublicAcademyInAcademyService,
  listAcademiesFromAcademyService,
} from "@/lib/academyService";
import {
  legacySocialUrlsFromLinks,
  parseAcademySocialLinksJson,
  socialLinksFromLegacy,
  type AcademySocialLinkInput,
} from "@/lib/academy-social-links";
import {
  OutboundEmailStatus,
  queueEmail,
  sendQueuedEmail,
} from "@/lib/reliable-email";
import { academySchema } from "@/lib/validators";
import type { AcademyFormState } from "@/app/admin/academies/actions";

function getFormValues(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries())
      .filter(([key]) => !key.startsWith("$ACTION_"))
      .map(([key, value]) => [key, String(value)]),
  );
}

function validationError(
  formData: FormData,
  fieldErrors: Record<string, string[] | undefined>,
  message = "Please fix the highlighted fields and try again.",
): AcademyFormState {
  return {
    message,
    fieldErrors,
    values: getFormValues(formData),
  };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function verificationEmailHtml({
  academyName,
  code,
}: {
  academyName: string;
  code: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>Verify your academy registration email</title></head>
<body style="margin:0;padding:0;background:#f6f8f7;font-family:Arial,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="padding:28px 32px;background:#0f766e;color:#ffffff;"><h1 style="margin:0;font-size:24px;">RollFinders</h1><p style="margin:8px 0 0;font-size:14px;">Academy registration email check</p></td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:22px;color:#111827;">Verify this email</h2>
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Use this code to verify the contact email for ${escapeHtml(academyName)}.</p>
          <p style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center;margin:24px 0;color:#0f766e;">${escapeHtml(code)}</p>
          <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:0;">The academy listing has been created as unverified. Creating the listing does not grant ownership; owners can claim it after review.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendAcademyRegistrationCode(email: string, academyName: string) {
  const code = String(randomInt(100000, 1000000));
  const outboundEmail = await queueEmail({
    to: normalizeEmail(email),
    subject: "Your RollFinders academy registration code",
    text: `Use this code to verify the contact email for ${academyName}: ${code}\n\nThe academy listing has been created as unverified. Creating the listing does not grant ownership; owners can claim it after review.`,
    html: verificationEmailHtml({ academyName, code }),
    metadata: {
      purpose: "public_academy_registration_email_check",
      academyName,
    },
  });
  const sentEmail = await sendQueuedEmail(outboundEmail.id);
  if (sentEmail?.status !== OutboundEmailStatus.SENT) {
    throw new Error(
      sentEmail?.failureReason ?? "Verification code email was not sent.",
    );
  }
}

function toNullable(value: string | null | undefined) {
  return value ? value : null;
}

function toNullableNumber(value: number | "" | undefined) {
  return value === "" || value === undefined ? null : value;
}

function socialLinksForSubmission(
  data: ReturnType<typeof academySchema.parse>,
  formData: FormData,
) {
  const submitted = formData.get("socialLinksJson");
  const parsed = parseAcademySocialLinksJson(submitted);
  if (parsed.error) return parsed;
  if (parsed.links.length > 0) return parsed;
  if (submitted !== null) return { links: [] as AcademySocialLinkInput[] };
  return { links: socialLinksFromLegacy(data) };
}

function publicAcademyData(
  data: ReturnType<typeof academySchema.parse>,
  socialLinks: AcademySocialLinkInput[],
) {
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
    publicListingVerified: false,
    bookingVerified: false,
    paymentsVerified: false,
    verificationStatus: AcademyVerificationStatus.PENDING,
    featured: false,
    borough: toNullable(data.borough),
    website: toNullable(data.website),
    email: toNullable(data.email),
    logoUrl: toNullable(data.logoUrl),
    coverImageUrl: toNullable(data.coverImageUrl),
    categories: toNullable(data.categories),
    facebookUrl: toNullable(legacySocialUrls.facebookUrl || data.facebookUrl),
    instagramUrl: toNullable(
      legacySocialUrls.instagramUrl || data.instagramUrl,
    ),
    xUrl: toNullable(legacySocialUrls.xUrl || data.xUrl),
    dropInPrice: toNullableNumber(data.dropInPrice),
    socialLinks,
  };
}

async function findDuplicateAcademy(
  name: string,
  address: string,
  postcode: string,
) {
  const normalized = {
    address: address.trim().toLowerCase(),
    name: name.trim().toLowerCase(),
    postcode: postcode.trim().toLowerCase(),
  };
  const academies = await listAcademiesFromAcademyService({ limit: 250 });
  return academies.find(
    (academy) =>
      academy.name.trim().toLowerCase() === normalized.name &&
      academy.address.trim().toLowerCase() === normalized.address &&
      academy.postcode.trim().toLowerCase() === normalized.postcode,
  );
}

export async function createPublicAcademy(
  _state: AcademyFormState,
  formData: FormData,
): Promise<AcademyFormState> {
  const parsed = academySchema.safeParse({
    ...getFormValues(formData),
    bookingVerified: "off",
    featured: "off",
    paymentsVerified: "off",
    publicListingVerified: "off",
    verificationStatus: AcademyVerificationStatus.PENDING,
  });
  if (!parsed.success)
    return validationError(formData, parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  if (!data.email) {
    return validationError(formData, {
      email: [
        "Academy email is required so we can send the verification code.",
      ],
    });
  }

  const socialLinksResult = socialLinksForSubmission(data, formData);
  if (socialLinksResult.error) {
    return validationError(formData, {
      socialLinksJson: [socialLinksResult.error],
    });
  }

  const duplicateAcademy = await findDuplicateAcademy(
    data.name,
    data.address,
    data.postcode,
  );
  if (duplicateAcademy) {
    return validationError(
      formData,
      {
        address: [
          "This academy appears to already exist. Open the public profile and submit a claim instead.",
        ],
        name: ["This academy appears to already exist."],
        postcode: ["This academy appears to already exist."],
      },
      "This academy appears to already exist. Use the claim process for existing listings.",
    );
  }

  let createdAcademyName = "";
  let emailStatus: "sent" | "failed" = "sent";
  try {
    const academy = await createPublicAcademyInAcademyService(
      publicAcademyData(data, socialLinksResult.links),
    );
    createdAcademyName = academy.name;
    try {
      await sendAcademyRegistrationCode(data.email, academy.name);
    } catch {
      emailStatus = "failed";
    }
  } catch (error) {
    if (error instanceof AcademyServiceError && error.status === 409) {
      return validationError(
        formData,
        { slug: ["Use a unique slug for this academy."] },
        "An academy with this slug already exists.",
      );
    }
    if (error instanceof AcademyServiceError) {
      return validationError(
        formData,
        {},
        error.message || "Academy registration could not be completed.",
      );
    }
    throw error;
  }

  const params = new URLSearchParams({
    academy: createdAcademyName,
    email: emailStatus,
  });
  redirect(`/register/academy/confirmation?${params.toString()}`);
}
