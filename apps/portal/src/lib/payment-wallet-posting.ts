import "server-only";

import {
  listCourseOccurrencePaymentsPage,
  listPaymentOutboxEvents,
  markPaymentOutboxEventDelivered,
  type PaymentOutboxEvent,
  type PaymentRecord,
} from "@/lib/payments";
import { recordCoursePaymentWalletEffects } from "@/lib/course-payment-wallet-effects";

export type CoursePaymentWalletPostingResult = {
  scanned: number;
  eligible: number;
  posted: number;
  skipped: number;
  failed: { id: string; reason: string }[];
};

function emptyResult(): CoursePaymentWalletPostingResult {
  return { scanned: 0, eligible: 0, posted: 0, skipped: 0, failed: [] };
}

function mergeResult(target: CoursePaymentWalletPostingResult, source: CoursePaymentWalletPostingResult) {
  target.scanned += source.scanned;
  target.eligible += source.eligible;
  target.posted += source.posted;
  target.skipped += source.skipped;
  target.failed.push(...source.failed);
  return target;
}

function isSucceededCoursePayment(payment: PaymentRecord) {
  return payment.resourceType === "course_occurrence" && ["paid", "succeeded", "completed"].includes(payment.status.toLowerCase());
}

function paymentIdFromOutbox(event: PaymentOutboxEvent) {
  const payloadPaymentId = event.payload.payment_id;
  if (typeof payloadPaymentId === "string" && payloadPaymentId.trim()) return payloadPaymentId.trim();
  return event.aggregateId;
}

async function postPayment(paymentId: string, dryRun: boolean) {
  if (dryRun) return;
  await recordCoursePaymentWalletEffects(paymentId);
}

export async function processCoursePaymentWalletOutbox({
  dryRun = false,
  limit = 50,
}: {
  dryRun?: boolean;
  limit?: number;
} = {}): Promise<CoursePaymentWalletPostingResult> {
  const result = emptyResult();
  const events = await listPaymentOutboxEvents({ eventType: "payment.succeeded", limit });
  for (const event of events) {
    result.scanned++;
    if (event.eventType !== "payment.succeeded" || event.payload.resource_type !== "course_occurrence") {
      result.skipped++;
      continue;
    }
    result.eligible++;
    const paymentId = paymentIdFromOutbox(event);
    try {
      await postPayment(paymentId, dryRun);
      if (!dryRun) await markPaymentOutboxEventDelivered(event.id);
      result.posted++;
    } catch (error) {
      result.failed.push({ id: paymentId, reason: error instanceof Error ? error.message : "Wallet posting failed." });
    }
  }
  return result;
}

export async function backfillCoursePaymentWalletEffects({
  academyId,
  dryRun = false,
  limit = 100,
  maxPages = 20,
}: {
  academyId?: string;
  dryRun?: boolean;
  limit?: number;
  maxPages?: number;
} = {}): Promise<CoursePaymentWalletPostingResult> {
  const result = emptyResult();
  const pageSize = Math.min(Math.max(limit, 1), 100);

  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageSize;
    const pageResult = await listCourseOccurrencePaymentsPage({ limit: pageSize, offset });
    const partial = emptyResult();
    for (const payment of pageResult.payments) {
      partial.scanned++;
      if (!isSucceededCoursePayment(payment)) {
        partial.skipped++;
        continue;
      }
      if (academyId && payment.metadata?.academy_id !== academyId) {
        partial.skipped++;
        continue;
      }
      partial.eligible++;
      try {
        await postPayment(payment.id, dryRun);
        partial.posted++;
      } catch (error) {
        partial.failed.push({ id: payment.id, reason: error instanceof Error ? error.message : "Wallet posting failed." });
      }
    }
    mergeResult(result, partial);
    if (!pageResult.pagination.has_more) break;
  }

  return result;
}
