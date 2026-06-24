import { OutboundEmailStatus, queueEmail, sendQueuedEmail } from "@/lib/reliable-email";
import { confirmPasswordResetToken, requestPasswordResetToken, validatePasswordResetToken } from "@/lib/users-service";

const resetExpiryHours = 24;

function resetUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/reset-password?token=${token}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function passwordResetEmailHtml({ name, resetLink, year }: { name: string; resetLink: string; year: number }) {
  const escapedName = escapeHtml(name);
  const escapedResetLink = escapeHtml(resetLink);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Reset your RollFinders password</title>
</head>
<body style="margin:0; padding:0; background:#f6f8f7; font-family:Arial, sans-serif; color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f7; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:28px 32px; background:#0f766e; color:#ffffff;">
              <h1 style="margin:0; font-size:24px;">RollFinders</h1>
              <p style="margin:8px 0 0; font-size:14px;">Password reset request</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px; font-size:22px; color:#111827;">Reset your password</h2>

              <p style="font-size:16px; line-height:1.6; margin:0 0 16px;">
                Hi ${escapedName},
              </p>

              <p style="font-size:16px; line-height:1.6; margin:0 0 24px;">
                We received a request to reset your RollFinders password. Click the button below to create a new password.
              </p>

              <p style="text-align:center; margin:32px 0;">
                <a href="${escapedResetLink}" style="background:#0f766e; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:8px; font-weight:bold; display:inline-block;">
                  Reset Password
                </a>
              </p>

              <p style="font-size:14px; line-height:1.6; color:#4b5563; margin:0 0 16px;">
                This link will expire in 24 hours.
              </p>

              <p style="font-size:14px; line-height:1.6; color:#4b5563; margin:0;">
                If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px; background:#f9fafb; font-size:12px; color:#6b7280; text-align:center;">
              &copy; ${year} RollFinders. All rights reserved.
            </td>
          </tr>
        </table>

        <p style="font-size:12px; color:#6b7280; margin-top:16px;">
          If the button does not work, copy and paste this link into your browser:<br />
          <span style="color:#0f766e;">${escapedResetLink}</span>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function passwordChangedEmailHtml({ email, name, resetLink, year }: { email: string; name: string; resetLink: string; year: number }) {
  const escapedEmail = escapeHtml(email);
  const escapedName = escapeHtml(name);
  const escapedResetLink = escapeHtml(resetLink);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Your RollFinders password was changed</title>
</head>
<body style="margin:0; padding:0; background:#f6f8f7; font-family:Arial, sans-serif; color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f7; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:28px 32px; background:#0f766e; color:#ffffff;">
              <h1 style="margin:0; font-size:24px;">RollFinders</h1>
              <p style="margin:8px 0 0; font-size:14px;">Password changed</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px; font-size:22px; color:#111827;">Your password was changed</h2>

              <p style="font-size:16px; line-height:1.6; margin:0 0 16px;">
                Hi ${escapedName},
              </p>

              <p style="font-size:16px; line-height:1.6; margin:0 0 24px;">
                Your RollFinders password was changed. For your security, we do not send passwords by email.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px; border:1px solid #e5e7eb; border-radius:8px;">
                <tr>
                  <td style="padding:12px 16px; font-size:14px; font-weight:bold; color:#374151; border-bottom:1px solid #e5e7eb;">Username:</td>
                  <td style="padding:12px 16px; font-size:14px; color:#111827; border-bottom:1px solid #e5e7eb;">${escapedEmail}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; font-size:14px; font-weight:bold; color:#374151;">Password:</td>
                  <td style="padding:12px 16px; font-size:14px; color:#111827;">Not sent by email</td>
                </tr>
              </table>

              <p style="font-size:16px; line-height:1.6; margin:0 0 24px;">
                If you forget your password or did not make this change, use the button below to reset it.
              </p>

              <p style="text-align:center; margin:32px 0;">
                <a href="${escapedResetLink}" style="background:#0f766e; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:8px; font-weight:bold; display:inline-block;">
                  Reset Password
                </a>
              </p>

              <p style="font-size:14px; line-height:1.6; color:#4b5563; margin:0;">
                This link will expire in 24 hours.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px; background:#f9fafb; font-size:12px; color:#6b7280; text-align:center;">
              &copy; ${year} RollFinders. All rights reserved.
            </td>
          </tr>
        </table>

        <p style="font-size:12px; color:#6b7280; margin-top:16px;">
          If the button does not work, copy and paste this link into your browser:<br />
          <span style="color:#0f766e;">${escapedResetLink}</span>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function createPasswordResetLink(email: string) {
  const result = await requestPasswordResetToken(email);
  if (!result.token || !result.expiresAt) return null;
  const token = result.token;
  const expiresAt = new Date(result.expiresAt);
  const url = resetUrl(token);
  return { expiresAt, url, user: result.user };
}

async function sendQueuedPasswordEmail(outboundEmailId: string) {
  const sentEmail = await sendQueuedEmail(outboundEmailId);
  if (sentEmail?.status !== OutboundEmailStatus.SENT) {
    throw new Error(sentEmail?.failureReason ?? "Password reset email was not sent.");
  }
}

export async function queuePasswordResetEmail(user: { id: string; email: string; name?: string | null }) {
  const reset = await createPasswordResetLink(user.email);
  if (!reset) return {};
  const { expiresAt, url } = reset;
  const recipientName = user.name?.trim() || "there";

  const outboundEmail = await queueEmail({
    userId: null,
    to: user.email,
    subject: "Reset your RollFinders password",
    text: `Hi ${recipientName},\n\nWe received a request to reset your RollFinders password. Use this link to create a new password. The link expires in ${resetExpiryHours} hours.\n\n${url}\n\nIf you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.`,
    html: passwordResetEmailHtml({
      name: recipientName,
      resetLink: url,
      year: new Date().getFullYear(),
    }),
  });
  await sendQueuedPasswordEmail(outboundEmail.id);

  return { expiresAt };
}

export async function queuePasswordChangedEmail(user: { id: string; email: string; name?: string | null }) {
  const reset = await createPasswordResetLink(user.email);
  if (!reset) return {};
  const { expiresAt, url } = reset;
  const recipientName = user.name?.trim() || "there";

  const outboundEmail = await queueEmail({
    userId: null,
    to: user.email,
    subject: "Your RollFinders password was changed",
    text: `Hi ${recipientName},\n\nYour RollFinders password was changed.\n\nUsername: ${user.email}\nPassword: Not sent by email\n\nFor your security, we do not send passwords by email. If you forget your password or did not make this change, reset it here. This link expires in ${resetExpiryHours} hours.\n\n${url}`,
    html: passwordChangedEmailHtml({
      email: user.email,
      name: recipientName,
      resetLink: url,
      year: new Date().getFullYear(),
    }),
  });
  await sendQueuedPasswordEmail(outboundEmail.id);

  return { expiresAt };
}

export async function requestPasswordResetForEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) return { success: true };
  const reset = await requestPasswordResetToken(normalizedEmail);
  if (!reset.token || !reset.expiresAt || !reset.user) return { success: true };
  const url = resetUrl(reset.token);
  const recipientName = reset.user.name?.trim() || "there";
  const outboundEmail = await queueEmail({
    userId: null,
    to: reset.user.email,
    subject: "Reset your RollFinders password",
    text: `Hi ${recipientName},\n\nWe received a request to reset your RollFinders password. Use this link to create a new password. The link expires in ${resetExpiryHours} hours.\n\n${url}\n\nIf you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.`,
    html: passwordResetEmailHtml({
      name: recipientName,
      resetLink: url,
      year: new Date().getFullYear(),
    }),
  });
  await sendQueuedPasswordEmail(outboundEmail.id);
  return { success: true, expiresAt: new Date(reset.expiresAt) };
}

export async function getValidPasswordResetToken(token: string) {
  const result = await validatePasswordResetToken(token);
  return result.valid ? { token } : null;
}

export async function resetPasswordWithToken(token: string, password: string) {
  try {
    const result = await confirmPasswordResetToken(token, password);
    await queuePasswordChangedEmail(result.user);
    return { ok: true, email: result.user.email };
  } catch {
    return { ok: false, message: "This password reset link is invalid or expired." };
  }
}
