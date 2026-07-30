import { OutboundEmailStatus, queueEmail, sendQueuedEmail } from "@/lib/reliable-email";
import {
  confirmAccountDeletionToken,
  requestAccountDeletionByEmail,
  type AccountDeletionRequest,
} from "@/lib/users-service";

function deletionConfirmationUrl(token: string) {
  const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${baseUrl}/account-deletion/confirm?token=${encodeURIComponent(token)}`;
}

async function deliverEmail(input: {
  userId: string;
  email: string;
  subject: string;
  text: string;
  purpose: string;
}) {
  const queued = await queueEmail({
    userId: input.userId,
    to: input.email,
    subject: input.subject,
    text: input.text,
    metadata: { purpose: input.purpose },
  });
  if (queued.status === OutboundEmailStatus.PENDING) return;
  const sent = await sendQueuedEmail(queued.id);
  if (sent.status !== OutboundEmailStatus.SENT) {
    throw new Error(sent.failureReason ?? "Account deletion email was not sent.");
  }
}

export async function requestPublicAccountDeletion(email: string) {
  const result = await requestAccountDeletionByEmail(email.trim().toLowerCase());
  if (!result.token || !result.user) return;
  const name = result.user.name?.trim() || "there";
  const url = deletionConfirmationUrl(result.token);
  await deliverEmail({
    userId: result.user.id,
    email: result.user.email,
    subject: "Confirm your RollFinders account deletion request",
    purpose: "account_deletion_verification",
    text: `Hi ${name},\n\nConfirm that you want RollFinders to begin processing your account and personal-data deletion request:\n\n${url}\n\nThis single-use link expires in 24 hours. If you did not make this request, you can ignore this email.`,
  });
}

export async function confirmPublicAccountDeletion(token: string) {
  const result = await confirmAccountDeletionToken(token);
  await sendAccountDeletionAcknowledgement(result.user, result.request).catch(() => undefined);
  return result.request;
}

export async function sendAccountDeletionAcknowledgement(
  user: { id: string; email: string; name?: string | null },
  request: AccountDeletionRequest,
) {
  const dueAt = new Date(request.dueAt ?? request.updatedAt);
  const name = user.name?.trim() || "there";
  await deliverEmail({
    userId: user.id,
    email: user.email,
    subject: "RollFinders account deletion request confirmed",
    purpose: "account_deletion_acknowledgement",
    text: `Hi ${name},\n\nYour RollFinders account deletion request has been verified. We expect to complete it by ${dueAt.toLocaleDateString("en-GB")}.\n\nSome information may be retained where required by law, including financial, fraud-prevention, and legal records. You can cancel the request from dashboard settings until processing begins.`,
  });
}

export function accountDeletionDueLabel(request: AccountDeletionRequest) {
  if (!request.dueAt) return null;
  return new Date(request.dueAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
