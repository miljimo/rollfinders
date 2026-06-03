import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { OutboundEmailStatus, UserEmailStatus, type Prisma } from "@prisma/client";
import { getEmailProvisioningConfig } from "@/lib/email-provisioning";
import { prisma } from "@/lib/prisma";

const retryIntervalsMinutes = [5, 15, 60, 240, 1440];

type EmailPayload = {
  userId?: string | null;
  to: string;
  subject: string;
  text: string;
  html?: string | null;
};

type DeliveryResult =
  | { ok: true; messageId?: string }
  | { ok: false; permanent: boolean; reason: string };

function sesClient() {
  const config = getEmailProvisioningConfig();
  return new SESClient({ region: config.region });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function recordStatus(
  tx: Prisma.TransactionClient,
  outboundEmailId: string,
  status: OutboundEmailStatus,
  reason?: string | null,
) {
  await tx.outboundEmailStatusHistory.create({
    data: {
      outboundEmailId,
      status,
      reason: reason ?? null,
    },
  });
}

function nextAttemptDate(retryCount: number) {
  const delayMinutes = retryIntervalsMinutes[Math.min(retryCount, retryIntervalsMinutes.length - 1)];
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

function isPermanentFailure(error: unknown) {
  const errorText = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /invalid|rejected recipient|address|mailbox|domain|suppressed|blacklist/i.test(errorText);
}

function failureReason(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

async function deliverEmail(email: {
  recipientEmail: string;
  subject: string;
  textBody: string;
  htmlBody?: string | null;
}): Promise<DeliveryResult> {
  const config = getEmailProvisioningConfig();

  try {
    const response = await sesClient().send(
      new SendEmailCommand({
        Source: config.fromAddress,
        ReplyToAddresses: [config.replyToAddress],
        Destination: { ToAddresses: [email.recipientEmail] },
        Message: {
          Subject: { Data: email.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: email.textBody, Charset: "UTF-8" },
            ...(email.htmlBody ? { Html: { Data: email.htmlBody, Charset: "UTF-8" } } : {}),
          },
        },
      }),
    );

    return { ok: true, messageId: response.MessageId };
  } catch (error) {
    return {
      ok: false,
      permanent: isPermanentFailure(error),
      reason: failureReason(error),
    };
  }
}

async function markInvalidEmail({
  userId,
  email,
  reason,
}: {
  userId?: string | null;
  email: string;
  reason: string;
}) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.invalidEmailAddress.upsert({
      where: { email },
      create: {
        userId: userId ?? null,
        email,
        failureReason: reason,
        failureCount: 1,
        lastFailureAt: now,
      },
      update: {
        userId: userId ?? undefined,
        failureReason: reason,
        failureCount: { increment: 1 },
        lastFailureAt: now,
      },
    });

    if (userId) {
      await tx.user.update({
        where: { id: userId },
        data: {
          emailStatus: UserEmailStatus.INVALID,
          emailInvalidReason: reason,
          emailInvalidAt: now,
        },
      });
    } else {
      await tx.user.updateMany({
        where: { email },
        data: {
          emailStatus: UserEmailStatus.INVALID,
          emailInvalidReason: reason,
          emailInvalidAt: now,
        },
      });
    }
  });
}

export async function queueEmail(payload: EmailPayload) {
  const recipientEmail = normalizeEmail(payload.to);
  const invalidAddress = await prisma.invalidEmailAddress.findUnique({ where: { email: recipientEmail } });
  const user = payload.userId
    ? await prisma.user.findUnique({ where: { id: payload.userId }, select: { emailStatus: true } })
    : null;
  const blocked = Boolean(invalidAddress || user?.emailStatus === UserEmailStatus.INVALID);
  const failureReason = invalidAddress?.failureReason ?? (blocked ? "Recipient email is marked invalid." : null);

  const email = await prisma.outboundEmail.create({
    data: {
      userId: payload.userId ?? null,
      recipientEmail,
      subject: payload.subject,
      textBody: payload.text,
      htmlBody: payload.html ?? null,
      status: blocked ? OutboundEmailStatus.INVALID_EMAIL : OutboundEmailStatus.PENDING,
      failureReason,
      statusHistory: {
        create: {
          status: blocked ? OutboundEmailStatus.INVALID_EMAIL : OutboundEmailStatus.PENDING,
          reason: failureReason,
        },
      },
    },
  });

  return email;
}

export async function sendQueuedEmail(outboundEmailId: string) {
  const email = await prisma.outboundEmail.findUnique({ where: { id: outboundEmailId } });
  if (!email) return null;
  const sendableStatuses: OutboundEmailStatus[] = [
    OutboundEmailStatus.PENDING,
    OutboundEmailStatus.RETRY_PENDING,
    OutboundEmailStatus.FAILED,
  ];
  if (!sendableStatuses.includes(email.status)) {
    return email;
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.outboundEmail.update({
      where: { id: email.id },
      data: {
        status: OutboundEmailStatus.SENDING,
        lastAttemptAt: now,
      },
    });
    await recordStatus(tx, email.id, OutboundEmailStatus.SENDING);
  });

  const result = await deliverEmail(email);
  if (result.ok) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.outboundEmail.update({
        where: { id: email.id },
        data: {
          status: OutboundEmailStatus.SENT,
          sentAt: new Date(),
          failureReason: null,
          providerMessageId: result.messageId ?? null,
        },
      });
      await recordStatus(tx, email.id, OutboundEmailStatus.SENT, result.messageId);
      return updated;
    });
  }

  if (result.permanent) {
    await markInvalidEmail({ userId: email.userId, email: email.recipientEmail, reason: result.reason });
    return prisma.$transaction(async (tx) => {
      const updated = await tx.outboundEmail.update({
        where: { id: email.id },
        data: {
          status: OutboundEmailStatus.INVALID_EMAIL,
          failureReason: result.reason,
        },
      });
      await recordStatus(tx, email.id, OutboundEmailStatus.INVALID_EMAIL, result.reason);
      return updated;
    });
  }

  const retryCount = email.retryCount + 1;
  const exhausted = retryCount >= email.maxRetries;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.outboundEmail.update({
      where: { id: email.id },
      data: {
        status: exhausted ? OutboundEmailStatus.PERMANENTLY_FAILED : OutboundEmailStatus.RETRY_PENDING,
        retryCount,
        nextAttemptAt: exhausted ? email.nextAttemptAt : nextAttemptDate(retryCount),
        failureReason: result.reason,
      },
    });
    await recordStatus(
      tx,
      email.id,
      exhausted ? OutboundEmailStatus.PERMANENTLY_FAILED : OutboundEmailStatus.RETRY_PENDING,
      result.reason,
    );
    return updated;
  });
}

export async function processDueEmails(limit = 20) {
  const emails = await prisma.outboundEmail.findMany({
    where: {
      status: { in: [OutboundEmailStatus.PENDING, OutboundEmailStatus.RETRY_PENDING] },
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  });

  const results = [];
  for (const email of emails) {
    results.push(await sendQueuedEmail(email.id));
  }
  return results;
}
