import {
  OutboundEmailStatus,
  queueEmail,
  sendQueuedEmail,
} from "@/lib/reliable-email";
import {
  confirmEmailVerificationToken,
  requestEmailVerificationToken,
} from "@/lib/users-service";

function verificationUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
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
  name,
  url,
  year,
}: {
  name: string;
  url: string;
  year: number;
}) {
  const escapedName = escapeHtml(name);
  const escapedUrl = escapeHtml(url);
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>Verify your RollFinders email</title></head>
<body style="margin:0; padding:0; background:#f6f8f7; font-family:Arial, sans-serif; color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f7; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
          <tr><td style="padding:28px 32px; background:#0f766e; color:#ffffff;"><h1 style="margin:0; font-size:24px;">RollFinders</h1><p style="margin:8px 0 0; font-size:14px;">Email verification</p></td></tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px; font-size:22px; color:#111827;">Verify your email</h2>
              <p style="font-size:16px; line-height:1.6; margin:0 0 16px;">Hi ${escapedName},</p>
              <p style="font-size:16px; line-height:1.6; margin:0 0 24px;">Confirm your email address to activate your RollFinders account.</p>
              <p style="text-align:center; margin:32px 0;"><a href="${escapedUrl}" style="background:#0f766e; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:8px; font-weight:bold; display:inline-block;">Verify Email</a></p>
              <p style="font-size:14px; line-height:1.6; color:#4b5563; margin:0;">This link will expire in 24 hours.</p>
            </td>
          </tr>
          <tr><td style="padding:20px 32px; background:#f9fafb; font-size:12px; color:#6b7280; text-align:center;">&copy; ${year} RollFinders. All rights reserved.</td></tr>
        </table>
        <p style="font-size:12px; color:#6b7280; margin-top:16px;">If the button does not work, copy and paste this link into your browser:<br /><span style="color:#0f766e;">${escapedUrl}</span></p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendAccountVerificationEmail(email: string) {
  const result = await requestEmailVerificationToken(email);
  if (!result.token || !result.user) return { sent: false };

  const url = verificationUrl(result.token);
  const recipientName = result.user.name?.trim() || "there";
  const outboundEmail = await queueEmail({
    userId: result.user.id,
    to: result.user.email,
    subject: "Verify your RollFinders email",
    text: `Hi ${recipientName},\n\nConfirm your email address to activate your RollFinders account. This link expires in 24 hours.\n\n${url}`,
    html: verificationEmailHtml({
      name: recipientName,
      url,
      year: new Date().getFullYear(),
    }),
    metadata: { purpose: "email_verification" },
  });
  if (outboundEmail.status === OutboundEmailStatus.PENDING) {
    return {
      queued: true,
      sent: false,
      expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
    };
  }

  const sentEmail = await sendQueuedEmail(outboundEmail.id);
  if (sentEmail?.status !== OutboundEmailStatus.SENT) {
    throw new Error(
      sentEmail?.failureReason ?? "Verification email was not sent.",
    );
  }

  return {
    sent: true,
    expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
  };
}

export async function verifyAccountEmail(token: string) {
  await confirmEmailVerificationToken(token);
}
