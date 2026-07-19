import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  recordExternalPayment,
  type PaymentRecord,
} from "@/lib/payments";
import { recordCoursePaymentWalletEffects } from "@/lib/course-payment-wallet-effects";

type LegacyPaymentCandidate = {
  academy_id: string | null;
  academy_name: string | null;
  amount_minor: bigint | number | null;
  booking_id: string;
  bookable_id: string;
  bookable_instance_id: string;
  created_at: Date;
  currency: string | null;
  customer_id: string | null;
  event_title: string | null;
  guest_reference: string | null;
  metadata: Prisma.JsonValue | null;
  payment_id: string;
  provider: string | null;
  provider_payment_id: string | null;
  provider_status: string | null;
  status: string | null;
};

export type LegacyCoursePaymentRecoveryResult = {
  scanned: number;
  alreadyImported: number;
  importable: number;
  imported: number;
  walletPosted: number;
  dryRun: boolean;
  skipped: { id: string; reason: string }[];
  failed: { id: string; reason: string }[];
};

function emptyResult(dryRun: boolean): LegacyCoursePaymentRecoveryResult {
  return {
    alreadyImported: 0,
    dryRun,
    failed: [],
    importable: 0,
    imported: 0,
    scanned: 0,
    skipped: [],
    walletPosted: 0,
  };
}

function stringFromMetadata(metadata: Prisma.JsonValue | null, keys: string[]) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }
  const record = metadata as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function amountFromMetadata(metadata: Prisma.JsonValue | null) {
  const raw = stringFromMetadata(metadata, [
    "amount_minor",
    "payment_amount_minor",
    "paid_amount_minor",
    "donation_amount",
  ]);
  const amount = Number(raw);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
}

function positiveAmount(value: bigint | number | null) {
  if (typeof value === "bigint") {
    return value > BigInt(0) && value <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(value)
      : 0;
  }
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : 0;
}

function normalizedProvider(value: string | null) {
  const provider = (value ?? "").trim().toLowerCase();
  return provider === "paypal" ? "paypal" : "stripe";
}

function candidateAmount(candidate: LegacyPaymentCandidate) {
  return positiveAmount(candidate.amount_minor) || amountFromMetadata(candidate.metadata);
}

function candidateMetadata(candidate: LegacyPaymentCandidate, amount: number) {
  const base = {
    academy_id: candidate.academy_id ?? "",
    academy_name: candidate.academy_name ?? "",
    booking_id: candidate.booking_id,
    client_id: "rollfinders",
    course_id: candidate.bookable_id,
    course_title: candidate.event_title ?? "Legacy course occurrence",
    legacy_payment_id: candidate.payment_id,
    payment_scope: "COURSE_OCCURRENCE",
    recovered_from: "legacy_course_payment_recovery",
    resource_id: candidate.bookable_instance_id,
    resource_label: candidate.event_title ?? "Legacy course occurrence",
    resource_type: "course_occurrence",
    source: "rollfinders",
  };
  const metadataAmount = amountFromMetadata(candidate.metadata);
  return {
    ...base,
    ...(metadataAmount > 0 ? { legacy_amount_minor: String(amount) } : {}),
    ...(candidate.customer_id ? { payer_user_id: candidate.customer_id } : {}),
    ...(candidate.guest_reference ? { payer_email: candidate.guest_reference } : {}),
    ...(candidate.provider_payment_id
      ? { provider_payment_id: candidate.provider_payment_id }
      : {}),
  };
}

async function publicPaymentsTableExists() {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass('public.payments') IS NOT NULL AS exists
  `;
  return rows[0]?.exists === true;
}

async function existingImportedLegacyPayments(limit: number) {
  const rows = await prisma.$queryRaw<Array<{ legacy_payment_id: string; payment_id: string }>>`
    SELECT metadata->>'legacy_payment_id' AS legacy_payment_id, id AS payment_id
    FROM payments.payments
    WHERE metadata ? 'legacy_payment_id'
      AND COALESCE(metadata->>'resource_type', '') = 'course_occurrence'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return new Map(rows.map((row) => [row.legacy_payment_id, row.payment_id]));
}

async function missingBookingPaymentCandidates(limit: number) {
  return prisma.$queryRaw<LegacyPaymentCandidate[]>`
    SELECT
      b.id AS booking_id,
      b.bookable_id,
      b.bookable_instance_id,
      b.customer_id,
      b.guest_reference,
      b.organisation_id AS academy_id,
      b.payment_id,
      b.status,
      b.metadata,
      b.created_at,
      NULL::bigint AS amount_minor,
      NULL::text AS currency,
      NULL::text AS provider,
      NULL::text AS provider_payment_id,
      NULL::text AS provider_status,
      b.metadata->>'course_title' AS event_title,
      b.metadata->>'academy_name' AS academy_name
    FROM booking.bookings b
    LEFT JOIN payments.payments p ON p.id = b.payment_id
    WHERE b.bookable_type = 'course_occurrence'
      AND b.payment_id IS NOT NULL
      AND p.id IS NULL
      AND b.status IN ('payment_received', 'confirmed')
    ORDER BY b.created_at ASC
    LIMIT ${limit}
  `;
}

async function legacyPublicPaymentCandidates(limit: number) {
  return prisma.$queryRawUnsafe<LegacyPaymentCandidate[]>(`
    SELECT
      b.id AS booking_id,
      b.bookable_id,
      b.bookable_instance_id,
      b.customer_id,
      b.guest_reference,
      b.organisation_id AS academy_id,
      b.payment_id,
      b.status,
      COALESCE(b.metadata, '{}'::jsonb) || COALESCE(lp.metadata, '{}'::jsonb) AS metadata,
      COALESCE(lp.created_at, b.created_at) AS created_at,
      lp.amount_minor,
      lp.currency::text,
      lp.provider,
      lp.provider_payment_id,
      lp.provider_raw_status AS provider_status,
      COALESCE(lp.metadata->>'course_title', b.metadata->>'course_title') AS event_title,
      COALESCE(lp.metadata->>'academy_name', b.metadata->>'academy_name') AS academy_name
    FROM booking.bookings b
    JOIN public.payments lp ON lp.id = b.payment_id
    LEFT JOIN payments.payments p ON p.id = b.payment_id OR p.metadata->>'legacy_payment_id' = b.payment_id
    WHERE b.bookable_type = 'course_occurrence'
      AND b.payment_id IS NOT NULL
      AND p.id IS NULL
      AND b.status IN ('payment_received', 'confirmed')
      AND lower(lp.status) IN ('paid', 'succeeded', 'completed')
    ORDER BY COALESCE(lp.created_at, b.created_at) ASC
    LIMIT $1
  `, limit);
}

async function legacyCandidates(limit: number) {
  const candidates = await missingBookingPaymentCandidates(limit);
  if (!(await publicPaymentsTableExists())) return candidates;
  const byPaymentId = new Map(candidates.map((candidate) => [candidate.payment_id, candidate]));
  for (const candidate of await legacyPublicPaymentCandidates(limit)) {
    byPaymentId.set(candidate.payment_id, candidate);
  }
  return [...byPaymentId.values()].slice(0, limit);
}

async function postWallet(payment: PaymentRecord, dryRun: boolean) {
  if (dryRun) return;
  await recordCoursePaymentWalletEffects(payment.id);
}

export async function recoverLegacyCoursePayments({
  dryRun = true,
  limit = 100,
}: {
  dryRun?: boolean;
  limit?: number;
} = {}): Promise<LegacyCoursePaymentRecoveryResult> {
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const result = emptyResult(dryRun);
  const [candidates, existing] = await Promise.all([
    legacyCandidates(safeLimit),
    existingImportedLegacyPayments(1000),
  ]);

  for (const candidate of candidates) {
    result.scanned++;
    const existingPaymentId = existing.get(candidate.payment_id);
    if (existingPaymentId) {
      result.alreadyImported++;
      try {
        await postWallet({ id: existingPaymentId } as PaymentRecord, dryRun);
        if (!dryRun) result.walletPosted++;
      } catch (error) {
        result.failed.push({
          id: candidate.payment_id,
          reason: error instanceof Error ? error.message : "Wallet posting failed.",
        });
      }
      continue;
    }

    const amount = candidateAmount(candidate);
    if (amount <= 0) {
      result.skipped.push({
        id: candidate.payment_id,
        reason: "No actual settled payment amount was found; skipped to avoid guessing from course price.",
      });
      continue;
    }
    if (!candidate.academy_id) {
      result.skipped.push({
        id: candidate.payment_id,
        reason: "No academy id was found for the legacy booking.",
      });
      continue;
    }

    result.importable++;
    if (dryRun) continue;

    try {
      const payment = await recordExternalPayment({
        amount,
        currency: candidate.currency ?? "GBP",
        externalReference: candidate.payment_id,
        idempotencyKey: `legacy-course-payment-import:${candidate.payment_id}`,
        metadata: candidateMetadata(candidate, amount),
        paymentMethodType: normalizedProvider(candidate.provider) === "paypal" ? "paypal" : "card",
        provider: normalizedProvider(candidate.provider),
        providerPaymentId: candidate.provider_payment_id ?? undefined,
        providerStatus: candidate.provider_status ?? candidate.status ?? undefined,
        status: "succeeded",
      });
      result.imported++;
      await postWallet(payment, dryRun);
      result.walletPosted++;
    } catch (error) {
      result.failed.push({
        id: candidate.payment_id,
        reason: error instanceof Error ? error.message : "Legacy payment recovery failed.",
      });
    }
  }

  return result;
}
