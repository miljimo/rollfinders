import { getEmailProvisioningConfig } from "@/lib/email-provisioning";

export const OutboundEmailStatus = {
  PENDING: "PENDING",
  SENDING: "SENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  RETRY_PENDING: "RETRY_PENDING",
  INVALID_EMAIL: "INVALID_EMAIL",
  PERMANENTLY_FAILED: "PERMANENTLY_FAILED",
} as const;

export type OutboundEmailStatus = (typeof OutboundEmailStatus)[keyof typeof OutboundEmailStatus];

export const EmailDeliveryJobRunStatus = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export type EmailDeliveryJobRunStatus = (typeof EmailDeliveryJobRunStatus)[keyof typeof EmailDeliveryJobRunStatus];

type EmailPayload = {
  userId?: string | null;
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
};

type QueuedEmail = {
  id: string;
  userId: string | null;
  recipientEmail: string;
  subject: string;
  status: OutboundEmailStatus;
  retryCount: number;
  maxRetries: number;
  nextAttemptAt: Date;
  lastAttemptAt: Date | null;
  sentAt: Date | null;
  failureReason: string | null;
  providerMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type EmailQueueItem = Pick<
  QueuedEmail,
  | "id"
  | "userId"
  | "recipientEmail"
  | "subject"
  | "status"
  | "retryCount"
  | "maxRetries"
  | "nextAttemptAt"
  | "lastAttemptAt"
  | "sentAt"
  | "failureReason"
  | "createdAt"
  | "updatedAt"
> & {
  academy: { id: string; name: string; email?: string | null; slug: string } | null;
};

type EmailJobRun = {
  id: string;
  status: EmailDeliveryJobRunStatus;
  triggerSource: string;
  triggeredByUserId: string | null;
  triggeredByEmail: string | null;
  requestedLimit: number;
  processedCount: number;
  sentCount: number;
  retryPendingCount: number;
  failedCount: number;
  invalidCount: number;
  startedAt: Date;
  finishedAt: Date | null;
  errorMessage: string | null;
};

type EmailQueueOperationsSummary = {
  outboundEmailCount: number;
  dueQueueCount: number;
  scheduledRetryCount: number;
  attentionCount: number;
  invalidEmailCount: number;
  lastRun: EmailJobRun | null;
  recentRuns: EmailJobRun[];
  dueQueueItems: EmailQueueItem[];
  scheduledRetryItems: EmailQueueItem[];
  attentionItems: EmailQueueItem[];
  invalidEmails: {
    id: string;
    email: string;
    userId: string | null;
    failureReason: string;
    failureCount: number;
    lastFailureAt: Date;
    academy: { id: string; name: string; email?: string | null; slug: string } | null;
    latestOutboundEmail: Pick<QueuedEmail, "id" | "userId" | "recipientEmail" | "subject" | "status" | "updatedAt"> | null;
  }[];
};

type CreateNotificationResponse = {
  notificationId: string;
  status: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function notificationServiceBaseURL() {
  return (
    process.env.NOTIFICATION_SERVICE_BASE_URL ??
    process.env.NOTIFICATION_PUBLIC_BASE_URL ??
    "http://localhost:8080"
  ).replace(/\/+$/, "");
}

function notificationAPIKey() {
  return process.env.NOTIFICATION_API_KEY ?? "local-notification-api-key";
}

function sourceService() {
  return process.env.NOTIFICATION_SOURCE_SERVICE ?? "rollfinder-web";
}

function notificationHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-Key": notificationAPIKey(),
  };
}

function fromContact() {
  const config = getEmailProvisioningConfig();
  return {
    email: config.fromAddress,
    name: process.env.EMAIL_FROM_NAME ?? "RollFinders",
  };
}

function replyToContact() {
  const config = getEmailProvisioningConfig();
  return config.replyToAddress ? { email: config.replyToAddress } : undefined;
}

function queuedEmailFromNotification(payload: EmailPayload, response: CreateNotificationResponse): QueuedEmail {
  const now = new Date();
  return {
    id: response.notificationId,
    userId: payload.userId ?? null,
    recipientEmail: normalizeEmail(payload.to),
    subject: payload.subject,
    status: OutboundEmailStatus.PENDING,
    retryCount: 0,
    maxRetries: 5,
    nextAttemptAt: now,
    lastAttemptAt: null,
    sentAt: null,
    failureReason: null,
    providerMessageId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function jobRun({
  limit,
  status,
  trigger,
  errorMessage = null,
}: {
  limit: number;
  status: EmailDeliveryJobRunStatus;
  trigger: { source?: string; userId?: string | null; email?: string | null };
  errorMessage?: string | null;
}): EmailJobRun {
  const now = new Date();
  return {
    id: `notification-service-${now.getTime()}`,
    status,
    triggerSource: trigger.source ?? "API",
    triggeredByUserId: trigger.userId ?? null,
    triggeredByEmail: trigger.email ?? null,
    requestedLimit: limit,
    processedCount: 0,
    sentCount: 0,
    retryPendingCount: 0,
    failedCount: status === EmailDeliveryJobRunStatus.FAILED ? 1 : 0,
    invalidCount: 0,
    startedAt: now,
    finishedAt: now,
    errorMessage,
  };
}

function emptySummary(lastRun: EmailJobRun | null = null): EmailQueueOperationsSummary {
  return {
    outboundEmailCount: 0,
    dueQueueCount: 0,
    scheduledRetryCount: 0,
    attentionCount: 0,
    invalidEmailCount: 0,
    lastRun,
    recentRuns: lastRun ? [lastRun] : [],
    dueQueueItems: [],
    scheduledRetryItems: [],
    attentionItems: [],
    invalidEmails: [],
  };
}

export async function queueEmail(payload: EmailPayload): Promise<QueuedEmail> {
  const hasHTML = Boolean(payload.html && payload.html.trim());
  const response = await fetch(`${notificationServiceBaseURL()}/v1/notifications`, {
    method: "POST",
    headers: notificationHeaders(),
    body: JSON.stringify({
      channel: "EMAIL",
      priority: "NORMAL",
      subject: payload.subject,
      contentText: hasHTML ? payload.html : payload.text,
      isContentHtml: hasHTML,
      from: fromContact(),
      replyTo: replyToContact(),
      to: [{ email: normalizeEmail(payload.to) }],
      idempotencyKey: payload.idempotencyKey ?? undefined,
      metadata: {
        ...payload.metadata,
        sourceService: sourceService(),
        userId: payload.userId ?? undefined,
      },
    }),
  });

  if (!response.ok) {
    const reason = await response.text().catch(() => "");
    throw new Error(`Notification service rejected email (${response.status}): ${reason || response.statusText}`);
  }

  const created = (await response.json()) as CreateNotificationResponse;
  return queuedEmailFromNotification(payload, created);
}

export async function sendQueuedEmail(outboundEmailId: string): Promise<QueuedEmail> {
  const now = new Date();
  return {
    id: outboundEmailId,
    userId: null,
    recipientEmail: "",
    subject: "",
    status: OutboundEmailStatus.SENT,
    retryCount: 0,
    maxRetries: 5,
    nextAttemptAt: now,
    lastAttemptAt: now,
    sentAt: now,
    failureReason: null,
    providerMessageId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function processDueEmails(): Promise<QueuedEmail[]> {
  return [];
}

export async function getEmailQueueOperationsSummary() {
  return emptySummary();
}

export async function processEmailDeliveryJob(
  limit = 20,
  trigger: { source?: string; userId?: string | null; email?: string | null } = {},
) {
  const requestedLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 100) : 20;
  const run = jobRun({
    limit: requestedLimit,
    status: EmailDeliveryJobRunStatus.SUCCESS,
    trigger,
  });

  return {
    run,
    processed: [] as QueuedEmail[],
    summary: emptySummary(run),
  };
}
