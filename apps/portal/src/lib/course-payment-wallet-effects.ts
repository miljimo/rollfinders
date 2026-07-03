import "server-only";

import { getPayment, type PaymentRecord } from "@/lib/payments";

type WalletRecordResponse = {
  id: string;
  wallet_type: "internal" | "external";
  owner_id: string;
  currency: "GBP" | "Points";
  status: string;
};

type WalletPageResponse = {
  wallets?: WalletRecordResponse[];
};

type PricingPolicyResponse = {
  policy?: {
    provider_id: string;
    percentage_basis_points: number;
    fixed_amount_minor: number;
    currency: string;
    status: "ACTIVE" | "INACTIVE";
  };
};

function walletBaseUrl() {
  return process.env.WALLET_INTERNAL_BASE_URL || "http://wallet:8080";
}

function pricingBaseUrl() {
  return process.env.PRICING_INTERNAL_BASE_URL || "http://pricing:8080";
}

function systemOwnerId(name: "clearing" | "revenue") {
  if (name === "clearing") {
    return process.env.ROLLFINDERS_PAYMENT_CLEARING_WALLET_OWNER_ID || "rollfinders-payment-clearing";
  }
  return process.env.ROLLFINDERS_PLATFORM_REVENUE_WALLET_OWNER_ID || "rollfinders-platform-revenue";
}

async function parseJson<T>(response: Response, message: string): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${message} Status ${response.status}: ${JSON.stringify(body)}`);
  }
  return body as T;
}

async function listWallets(ownerId: string, currency = "GBP") {
  const params = new URLSearchParams({ owner_id: ownerId, currency, limit: "50" });
  const response = await fetch(`${walletBaseUrl()}/v1/wallets?${params.toString()}`, { cache: "no-store" });
  const body = await parseJson<WalletPageResponse>(response, "Wallet lookup failed.");
  return body.wallets ?? [];
}

async function createWallet(ownerId: string, walletType: "internal" | "external", currency = "GBP") {
  const response = await fetch(`${walletBaseUrl()}/v1/wallets`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet_type: walletType, owner_id: ownerId, currency }),
  });
  return parseJson<WalletRecordResponse>(response, "Wallet creation failed.");
}

async function findOrCreateActiveInternalWallet(ownerId: string, currency = "GBP") {
  const existing = (await listWallets(ownerId, currency)).find((wallet) => wallet.wallet_type === "internal" && wallet.status === "active");
  return existing ?? createWallet(ownerId, "internal", currency);
}

async function findAcademyReceivingWallet(ownerId: string, currency = "GBP") {
  const wallets = await listWallets(ownerId, currency);
  const external = wallets.find((wallet) => wallet.wallet_type === "external" && wallet.status === "active");
  const internal = wallets.find((wallet) => wallet.wallet_type === "internal" && wallet.status === "active");
  return external ?? internal ?? createWallet(ownerId, "internal", currency);
}

async function adjustment(input: {
  walletId: string;
  counterWalletId: string;
  type: "BOOKING_PAYMENT" | "COMMISSION";
  amount: number;
  currency: string;
  reason: string;
  reference: string;
  idempotencyKey: string;
}) {
  const response = await fetch(`${walletBaseUrl()}/v1/wallets/adjustment`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      wallet_id: input.walletId,
      counter_wallet_id: input.counterWalletId,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      reason: input.reason,
      reference: input.reference,
    }),
  });
  await parseJson(response, "Wallet adjustment failed.");
}

async function platformFeeAmount(payment: PaymentRecord) {
  const providerId = payment.metadata?.stripe_destination_account || payment.provider || "stripe";
  const params = new URLSearchParams({ provider_id: providerId, currency: payment.currency || "GBP" });
  const response = await fetch(`${pricingBaseUrl()}/v1/pricing/policies/platform-fee?${params.toString()}`, { cache: "no-store" });
  if (response.status === 404) return 0;
  const body = await parseJson<PricingPolicyResponse>(response, "Pricing policy lookup failed.");
  const policy = body.policy;
  if (!policy || policy.status !== "ACTIVE") return 0;
  const percentage = Math.floor((payment.amount * policy.percentage_basis_points) / 10000);
  return Math.max(0, Math.min(payment.amount, percentage + policy.fixed_amount_minor));
}

export async function recordCoursePaymentWalletEffects(paymentId: string) {
  const payment = await getPayment(paymentId);
  if (payment.resourceType !== "course_occurrence") return;
  if (!["paid", "succeeded", "completed"].includes(payment.status.toLowerCase())) return;

  const metadata = payment.metadata ?? {};
  const academyOwnerId = metadata.academy_owner_id || metadata.academy_id;
  if (!academyOwnerId) {
    throw new Error(`Payment ${payment.id} does not include academy owner wallet metadata.`);
  }

  const currency = payment.currency || "GBP";
  const academyWallet = await findAcademyReceivingWallet(academyOwnerId, currency);
  const clearingWallet = await findOrCreateActiveInternalWallet(systemOwnerId("clearing"), currency);
  const revenueWallet = await findOrCreateActiveInternalWallet(systemOwnerId("revenue"), currency);

  await adjustment({
    walletId: academyWallet.id,
    counterWalletId: clearingWallet.id,
    type: "BOOKING_PAYMENT",
    amount: payment.amount,
    currency,
    reason: "Course payment received",
    reference: payment.id,
    idempotencyKey: `course-payment-wallet-credit:${payment.id}`,
  });

  const feeAmount = await platformFeeAmount(payment);
  if (feeAmount <= 0) return;

  await adjustment({
    walletId: academyWallet.id,
    counterWalletId: revenueWallet.id,
    type: "COMMISSION",
    amount: feeAmount,
    currency,
    reason: "Platform fee for course payment",
    reference: payment.id,
    idempotencyKey: `course-payment-platform-fee:${payment.id}`,
  });
}
