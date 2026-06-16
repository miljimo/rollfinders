import { EmailDeliveryJobRunStatus, OutboundEmailStatus, UserEmailStatus, type Prisma } from "@prisma/client";
import nodemailer from "nodemailer";
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

function smtpTransport() {
  const config = getEmailProvisioningConfig();
  if (!config.smtpUsername || !config.smtpPassword) {
    throw new Error("SMTP_USERNAME or SMTP_PASSWORD is missing.");
  }

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: Number(config.smtpPort),
    secure: config.smtpPort === "465",
    auth: {
      user: config.smtpUsername,
      pass: config.smtpPassword,
    },
  });
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

function errorText(error: unknown) {
  return error instanceof Error ? `${error.name} ${error.message}` : String(error);
}

function isProviderConfigurationFailure(error: unknown) {
  const text = errorText(error);
  return /email address is not verified|identity.*failed.*check|production access|sandbox|configuration set|sending paused|SMTP delivery is enabled|SMTP.*auth|authentication failed|invalid login|credentials/i.test(
    text,
  );
}

function isPermanentFailure(error: unknown) {
  if (isProviderConfigurationFailure(error)) return false;

  const text = errorText(error);
  return /invalid|rejected recipient|address|mailbox|domain|suppressed|blacklist/i.test(text);
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
    const response = await smtpTransport().sendMail({
      from: config.fromAddress,
      replyTo: config.replyToAddress,
      to: email.recipientEmail,
      subject: email.subject,
      text: email.textBody,
      ...(email.htmlBody ? { html: email.htmlBody } : {}),
    });

    return { ok: true, messageId: response.messageId };
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
    ? await prisma.user.findUnique({ where: { id: payload.userId }, select: { emailStatus: true, emailInvalidReason: true } })
    : null;
  const invalidAddressIsProviderConfig = invalidAddress ? isProviderConfigurationFailure(invalidAddress.failureReason) : false;
  const userInvalidIsProviderConfig = user?.emailInvalidReason ? isProviderConfigurationFailure(user.emailInvalidReason) : false;
  const blocked = Boolean(
    (invalidAddress && !invalidAddressIsProviderConfig) ||
    (user?.emailStatus === UserEmailStatus.INVALID && !userInvalidIsProviderConfig),
  );
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

async function clearProviderConfigurationInvalidEmail({
  userId,
  email,
}: {
  userId?: string | null;
  email: string;
}) {
  const invalidAddress = await prisma.invalidEmailAddress.findUnique({ where: { email } });
  if (invalidAddress && isProviderConfigurationFailure(invalidAddress.failureReason)) {
    await prisma.invalidEmailAddress.delete({ where: { email } });
  }

  if (!userId) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailStatus: true, emailInvalidReason: true },
  });
  if (user?.emailStatus === UserEmailStatus.INVALID && user.emailInvalidReason && isProviderConfigurationFailure(user.emailInvalidReason)) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailStatus: UserEmailStatus.VALID,
        emailInvalidReason: null,
        emailInvalidAt: null,
      },
    });
  }
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
    await clearProviderConfigurationInvalidEmail({ userId: email.userId, email: email.recipientEmail });
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

const attentionStatuses: OutboundEmailStatus[] = [
  OutboundEmailStatus.FAILED,
  OutboundEmailStatus.RETRY_PENDING,
  OutboundEmailStatus.INVALID_EMAIL,
  OutboundEmailStatus.PERMANENTLY_FAILED,
];

const outboundEmailQueueSelect = {
  id: true,
  recipientEmail: true,
  subject: true,
  status: true,
  retryCount: true,
  maxRetries: true,
  nextAttemptAt: true,
  lastAttemptAt: true,
  sentAt: true,
  failureReason: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      academy: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.OutboundEmailSelect;

export async function getEmailQueueOperationsSummary() {
  const now = new Date();
  const [
    outboundEmailCount,
    dueQueueCount,
    scheduledRetryCount,
    attentionCount,
    invalidEmailCount,
    lastRun,
    recentRuns,
    invalidEmailRecords,
    dueQueueItems,
    scheduledRetryItems,
    attentionItems,
  ] = await Promise.all([
    prisma.outboundEmail.count(),
    prisma.outboundEmail.count({
      where: {
        status: { in: [OutboundEmailStatus.PENDING, OutboundEmailStatus.RETRY_PENDING] },
        nextAttemptAt: { lte: now },
      },
    }),
    prisma.outboundEmail.count({
      where: {
        status: OutboundEmailStatus.RETRY_PENDING,
        nextAttemptAt: { gt: now },
      },
    }),
    prisma.outboundEmail.count({ where: { status: { in: attentionStatuses } } }),
    prisma.invalidEmailAddress.count(),
    prisma.emailDeliveryJobRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.emailDeliveryJobRun.findMany({ orderBy: { startedAt: "desc" }, take: 5 }),
    prisma.invalidEmailAddress.findMany({
      orderBy: { lastFailureAt: "desc" },
      take: 25,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            academy: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.outboundEmail.findMany({
      where: {
        status: { in: [OutboundEmailStatus.PENDING, OutboundEmailStatus.RETRY_PENDING] },
        nextAttemptAt: { lte: now },
      },
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
      take: 25,
      select: outboundEmailQueueSelect,
    }),
    prisma.outboundEmail.findMany({
      where: {
        status: OutboundEmailStatus.RETRY_PENDING,
        nextAttemptAt: { gt: now },
      },
      orderBy: [{ nextAttemptAt: "asc" }, { updatedAt: "desc" }],
      take: 25,
      select: outboundEmailQueueSelect,
    }),
    prisma.outboundEmail.findMany({
      where: { status: { in: attentionStatuses } },
      orderBy: [{ updatedAt: "desc" }],
      take: 25,
      select: outboundEmailQueueSelect,
    }),
  ]);
  const recipientEmails = Array.from(
    new Set([
      ...invalidEmailRecords.map((record) => record.email),
      ...dueQueueItems.map((email) => email.recipientEmail),
      ...scheduledRetryItems.map((email) => email.recipientEmail),
      ...attentionItems.map((email) => email.recipientEmail),
    ]),
  );
  const [matchedAcademies, recentOutboundEmails] = recipientEmails.length
    ? await Promise.all([
        prisma.academy.findMany({
          where: { email: { in: recipientEmails } },
          select: { id: true, name: true, email: true, slug: true },
        }),
        prisma.outboundEmail.findMany({
          where: { recipientEmail: { in: recipientEmails } },
          orderBy: [{ updatedAt: "desc" }],
          take: 100,
          select: {
            id: true,
            recipientEmail: true,
            subject: true,
            status: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        }),
      ])
    : [[], []];
  const academyByEmail = new Map(matchedAcademies.map((academy) => [academy.email?.toLowerCase(), academy]));
  const latestOutboundByEmail = new Map<string, (typeof recentOutboundEmails)[number]>();
  recentOutboundEmails.forEach((email) => {
    if (!latestOutboundByEmail.has(email.recipientEmail)) {
      latestOutboundByEmail.set(email.recipientEmail, email);
    }
  });

  return {
    outboundEmailCount,
    dueQueueCount,
    scheduledRetryCount,
    attentionCount,
    invalidEmailCount,
    lastRun,
    recentRuns,
    dueQueueItems: dueQueueItems.map((email) => ({
      ...email,
      academy: academyByEmail.get(email.recipientEmail.toLowerCase()) ?? null,
    })),
    scheduledRetryItems: scheduledRetryItems.map((email) => ({
      ...email,
      academy: academyByEmail.get(email.recipientEmail.toLowerCase()) ?? null,
    })),
    attentionItems: attentionItems.map((email) => ({
      ...email,
      academy: academyByEmail.get(email.recipientEmail.toLowerCase()) ?? null,
    })),
    invalidEmails: invalidEmailRecords.map((record) => ({
      id: record.id,
      email: record.email,
      failureReason: record.failureReason,
      failureCount: record.failureCount,
      lastFailureAt: record.lastFailureAt,
      user: record.user,
      academy: academyByEmail.get(record.email.toLowerCase()) ?? null,
      latestOutboundEmail: latestOutboundByEmail.get(record.email) ?? null,
    })),
  };
}

export async function processEmailDeliveryJob(
  limit = 20,
  trigger: { source?: string; userId?: string | null; email?: string | null } = {},
) {
  const requestedLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 100) : 20;
  const startedAt = new Date();
  const triggerSource = trigger.source ?? "API";
  const triggeredByUserId = trigger.userId ?? null;
  const triggeredByEmail = trigger.email ?? null;

  try {
    const processed = await processDueEmails(requestedLimit);
    const processedEmails = processed.filter(Boolean);
    const sentCount = processedEmails.filter((email) => email?.status === OutboundEmailStatus.SENT).length;
    const retryPendingCount = processedEmails.filter((email) => email?.status === OutboundEmailStatus.RETRY_PENDING).length;
    const failedCount = processedEmails.filter((email) => email?.status === OutboundEmailStatus.FAILED || email?.status === OutboundEmailStatus.PERMANENTLY_FAILED).length;
    const invalidCount = processedEmails.filter((email) => email?.status === OutboundEmailStatus.INVALID_EMAIL).length;
    const summary = await getEmailQueueOperationsSummary();
    const run = await prisma.emailDeliveryJobRun.create({
      data: {
        status: EmailDeliveryJobRunStatus.SUCCESS,
        triggerSource,
        triggeredByUserId,
        triggeredByEmail,
        requestedLimit,
        processedCount: processedEmails.length,
        sentCount,
        retryPendingCount,
        failedCount,
        invalidCount,
        startedAt,
        finishedAt: new Date(),
      },
    });

    return {
      run,
      processed,
      summary: { ...summary, lastRun: run },
    };
  } catch (error) {
    const reason = failureReason(error);
    const summary = await getEmailQueueOperationsSummary();
    const run = await prisma.emailDeliveryJobRun.create({
      data: {
        status: EmailDeliveryJobRunStatus.FAILED,
        triggerSource,
        triggeredByUserId,
        triggeredByEmail,
        requestedLimit,
        processedCount: 0,
        sentCount: 0,
        retryPendingCount: 0,
        failedCount: 0,
        invalidCount: 0,
        startedAt,
        finishedAt: new Date(),
        errorMessage: reason,
      },
    });

    return {
      run,
      processed: [],
      summary: { ...summary, lastRun: run },
    };
  }
}
