import { readFileSync } from "node:fs";
import path from "node:path";

const templatePath = path.join(
  process.cwd(),
  "src/lib/email/templates/academy-claim-invitation/v1/academy-claim-invitation.html",
);

const requiredTemplateVariables = [
  "academyName",
  "academyProfileUrl",
  "claimInvitationUrl",
  "recipientEmail",
  "supportEmail",
  "currentYear",
] as const;

type TemplateVariable = (typeof requiredTemplateVariables)[number];

export type AcademyClaimInvitationEmailInput = Record<TemplateVariable, string>;

export type AcademyClaimInvitationEmail = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validateTemplateValues(values: AcademyClaimInvitationEmailInput) {
  for (const key of requiredTemplateVariables) {
    if (!values[key]?.trim()) {
      throw new Error(`Academy claim invitation email is missing required value: ${key}`);
    }
  }
}

function assertNoUnresolvedPlaceholders(html: string) {
  const unresolved = html.match(/{{\s*[^}]+\s*}}/g);
  if (unresolved) {
    throw new Error(`Academy claim invitation email has unresolved placeholders: ${unresolved.join(", ")}`);
  }
}

function renderTemplate(values: AcademyClaimInvitationEmailInput) {
  validateTemplateValues(values);

  let html = readFileSync(templatePath, "utf8");
  for (const key of requiredTemplateVariables) {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(values[key]));
  }
  assertNoUnresolvedPlaceholders(html);
  return html;
}

export function renderAcademyClaimInvitationEmail(
  values: AcademyClaimInvitationEmailInput,
): AcademyClaimInvitationEmail {
  const html = renderTemplate(values);

  return {
    subject: "Claim your academy listing on RollFinders",
    text: [
      "Hi,",
      "",
      `RollFinders has added ${values.academyName} so Brazilian Jiu-Jitsu practitioners can discover accurate academy and open mat information.`,
      "",
      "If you own or manage this academy, you can claim the listing for free. Claim submissions are reviewed before management access is granted.",
      "",
      `Claim this academy: ${values.claimInvitationUrl}`,
      "",
      `Review the public listing: ${values.academyProfileUrl}`,
      "",
      "After claiming, you can update academy details and contact information, manage open mats and training availability, and keep location, gi/no-gi, and drop-in information accurate.",
      "",
      `This invitation was sent to ${values.recipientEmail}. If you are not the right contact for ${values.academyName}, reply to this email and let us know.`,
      "",
      `Need help? Contact ${values.supportEmail}.`,
      "",
      "RollFinders",
    ].join("\n"),
    html,
  };
}
