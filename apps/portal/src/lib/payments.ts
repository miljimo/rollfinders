import "server-only";

import { apiGatewayUrl } from "./apiGateway";

if (typeof window !== "undefined") {
  throw new Error("Payment service calls are server-only.");
}

type PaymentProvider = "stripe" | "paypal";
type PaymentMethodType = "card" | "google_pay" | "paypal";

export type CreateCourseOccurrenceCheckoutInput = {
  clientId?: string;
  clientState?: string;
  courseId: string;
  academyId: string;
  occurrenceDate: string;
  occurrenceStartTime: string;
  occurrenceEndTime: string;
  amountMinor: number;
  currency: string;
  provider: PaymentProvider;
  paymentMethodType: PaymentMethodType;
  payerUserId?: string;
  payerEmail?: string;
  metadata?: Record<string, string>;
  idempotencyKey: string;
};

export type Checkout = {
  checkoutSessionId: string;
  checkoutUrl: string;
  paymentId: string;
  expiresAt: string;
};

export type CourseOccurrenceCheckout = Checkout;

export type PaymentRecord = {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  paymentMethodType: string;
  status: string;
  refundedAmount: number;
  metadata?: Record<string, string>;
  providerPaymentId?: string;
  providerStatus?: string;
  createdAt: string;
  updatedAt: string;
  checkoutSessionId?: string;
  clientId?: string;
  clientState?: string;
  resourceType?: string;
  resourceId?: string;
  resourceLabel?: string;
  payerUserId?: string;
  payerEmail?: string;
};

export type CancelPaymentInput = {
  paymentId: string;
  idempotencyKey: string;
};

export type CreatePaymentRefundInput = {
  paymentId: string;
  idempotencyKey: string;
  amount?: number;
  reason?: string;
};

export type PaymentRefundRecord = {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
  providerRefundId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentAccountSetting = {
  id: string;
  ownerType: "academy" | "platform";
  ownerId: string;
  academyId?: string;
  provider: string;
  providerAccountId?: string;
  status: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type CheckoutResponse = {
  checkout_session_id: string;
  client_id: string;
  client_state?: string;
  checkout_url: string;
  payment_id: string;
  expires_at: string;
};

type PaymentRecordResponse = {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  payment_method_type: string;
  status: string;
  refunded_amount: number;
  metadata?: Record<string, string>;
  provider_payment_id?: string;
  provider_status?: string;
  created_at: string;
  updated_at: string;
  checkout_session_id?: string;
  client_id?: string;
  client_state?: string;
  resource_type?: string;
  resource_id?: string;
  resource_label?: string;
  payer_user_id?: string;
  payer_email?: string;
};

type PaymentHistoryResponse = {
  payments: PaymentRecordResponse[];
  count: number;
  pagination?: ServicePaginationMeta;
};

type PaymentRefundRecordResponse = {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
  provider_refund_id?: string;
  created_at: string;
  updated_at: string;
};

type PaymentAccountSettingResponse = {
  id: string;
  owner_type: "academy" | "platform";
  owner_id: string;
  academy_id?: string;
  provider: string;
  provider_account_id?: string;
  status: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  created_at: string;
  updated_at: string;
};

type StripeConnectResponse = {
  account: PaymentAccountSettingResponse;
  redirect_url: string;
};

const paymentServiceUrl = apiGatewayUrl;

export type ServicePaginationMeta = {
  limit: number;
  offset: number;
  count: number;
  has_more: boolean;
  next_offset?: number;
};

export type PaginatedPayments = {
  payments: PaymentRecord[];
  pagination: ServicePaginationMeta;
};

export class PaymentServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

type ErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export async function createCourseOccurrenceCheckout(
  input: CreateCourseOccurrenceCheckoutInput,
): Promise<CourseOccurrenceCheckout> {
  const response = await fetch(`${paymentServiceUrl()}/v1/checkouts`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      client_id: input.clientId ?? "rollfinders",
      client_state: input.clientState,
      resource_type: "course_occurrence",
      resource_id: [input.courseId, input.occurrenceDate, input.occurrenceStartTime].join(":"),
      resource_label: "Course occurrence",
      amount: input.amountMinor,
      currency: input.currency,
      provider: input.provider,
      payment_method_type: input.paymentMethodType,
      payer_user_id: input.payerUserId,
      payer_email: input.payerEmail,
      metadata: {
        source: "rollfinders",
        payment_scope: "COURSE_OCCURRENCE",
        course_id: input.courseId,
        academy_id: input.academyId,
        occurrence_date: input.occurrenceDate,
        occurrence_start_time: input.occurrenceStartTime,
        occurrence_end_time: input.occurrenceEndTime,
        ...input.metadata,
      },
    }),
  });

  if (!response.ok) {
    const error = await readPaymentServiceError(response);
    throw new PaymentServiceError(error.message ?? `Payment service checkout creation failed with status ${response.status}.`, response.status, error.code);
  }

  const checkout = (await response.json()) as CheckoutResponse;
  return {
    checkoutSessionId: checkout.checkout_session_id,
    checkoutUrl: checkout.checkout_url,
    paymentId: checkout.payment_id,
    expiresAt: checkout.expires_at,
  };
}

export async function listCourseOccurrencePayments({ accessToken, limit = 100 }: { accessToken?: string; limit?: number } = {}): Promise<PaymentRecord[]> {
  const result = await listCourseOccurrencePaymentsPage({ accessToken, limit });
  return result.payments;
}

export async function listCourseOccurrencePaymentsPage({ accessToken, limit = 10, offset = 0 }: { accessToken?: string; limit?: number; offset?: number } = {}): Promise<PaginatedPayments> {
  const params = new URLSearchParams({
    client_id: "rollfinders",
    offset: String(offset),
    resource_type: "course_occurrence",
    limit: String(limit),
  });
  const response = await fetch(`${paymentServiceUrl()}/v1/payments?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    headers: paymentServiceHeaders({ accessToken }),
  });
  if (!response.ok) {
    throw new PaymentServiceError(`Payment service history request failed with status ${response.status}.`, response.status);
  }
  const history = (await response.json()) as PaymentHistoryResponse;
  const payments = history.payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    paymentMethodType: payment.payment_method_type,
    status: payment.status,
    refundedAmount: payment.refunded_amount,
    metadata: payment.metadata,
    providerPaymentId: payment.provider_payment_id,
    providerStatus: payment.provider_status,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
    checkoutSessionId: payment.checkout_session_id,
    clientId: payment.client_id,
    clientState: payment.client_state,
    resourceType: payment.resource_type,
    resourceId: payment.resource_id,
    resourceLabel: payment.resource_label,
    payerUserId: payment.payer_user_id,
    payerEmail: payment.payer_email,
  })).filter(isProviderBackedPaymentRecord);
  return {
    payments,
    pagination: history.pagination ?? {
      count: payments.length,
      has_more: payments.length >= limit,
      limit,
      next_offset: offset + payments.length,
      offset,
    },
  };
}

function mapPaymentRecord(payment: PaymentRecordResponse): PaymentRecord {
  return {
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    paymentMethodType: payment.payment_method_type,
    status: payment.status,
    refundedAmount: payment.refunded_amount,
    metadata: payment.metadata,
    providerPaymentId: payment.provider_payment_id,
    providerStatus: payment.provider_status,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
    checkoutSessionId: payment.checkout_session_id,
    clientId: payment.client_id,
    clientState: payment.client_state,
    resourceType: payment.resource_type,
    resourceId: payment.resource_id,
    resourceLabel: payment.resource_label,
    payerUserId: payment.payer_user_id,
    payerEmail: payment.payer_email,
  };
}

export async function getPayment(paymentId: string): Promise<PaymentRecord> {
  const response = await fetch(`${paymentServiceUrl()}/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await readPaymentServiceError(response);
    throw new PaymentServiceError(error.message ?? `Payment service request failed with status ${response.status}.`, response.status, error.code);
  }
  return mapPaymentRecord((await response.json()) as PaymentRecordResponse);
}

export async function cancelPayment(input: CancelPaymentInput): Promise<PaymentRecord> {
  const response = await fetch(`${paymentServiceUrl()}/v1/payments/${encodeURIComponent(input.paymentId)}/cancel`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
  });

  if (!response.ok) {
    const error = await readPaymentServiceError(response);
    throw new PaymentServiceError(error.message ?? `Payment service cancellation failed with status ${response.status}.`, response.status, error.code);
  }

  return mapPaymentRecord((await response.json()) as PaymentRecordResponse);
}

export async function createPaymentRefund(input: CreatePaymentRefundInput): Promise<PaymentRefundRecord> {
  const response = await fetch(`${paymentServiceUrl()}/v1/payments/${encodeURIComponent(input.paymentId)}/refunds`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      amount: input.amount ?? 0,
      reason: input.reason ?? "booking_cancelled_by_academy",
    }),
  });

  if (!response.ok) {
    const error = await readPaymentServiceError(response);
    throw new PaymentServiceError(error.message ?? `Payment service refund request failed with status ${response.status}.`, response.status, error.code);
  }

  const refund = (await response.json()) as PaymentRefundRecordResponse;
  return {
    id: refund.id,
    paymentId: refund.payment_id,
    amount: refund.amount,
    currency: refund.currency,
    status: refund.status,
    reason: refund.reason,
    providerRefundId: refund.provider_refund_id,
    createdAt: refund.created_at,
    updatedAt: refund.updated_at,
  };
}

type PaymentServiceActor = {
  accessToken?: string;
  actorUserId?: string;
  organisationId?: string | null;
  ownerId?: string;
  ownerType?: "academy" | "platform";
};

export async function getStripePaymentAccountSetting(owner: { ownerType: "academy" | "platform"; ownerId: string } & PaymentServiceActor): Promise<PaymentAccountSetting | null> {
  const params = new URLSearchParams({
    owner_type: owner.ownerType,
    owner_id: owner.ownerId,
  });
  const response = await fetch(`${paymentServiceUrl()}/v1/payment-accounts/stripe?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    headers: paymentServiceHeaders(owner),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = await readPaymentServiceError(response);
    throw new PaymentServiceError(error.message ?? `Payment account request failed with status ${response.status}.`, response.status, error.code);
  }
  return mapPaymentAccountSetting((await response.json()) as PaymentAccountSettingResponse);
}

export async function createStripeConnectAccountLink(input: {
  ownerType: "academy" | "platform";
  ownerId: string;
  email: string;
  refreshUrl: string;
  returnUrl: string;
} & PaymentServiceActor): Promise<{ account: PaymentAccountSetting; redirectUrl: string }> {
  const response = await fetch(`${paymentServiceUrl()}/v1/payment-accounts/stripe/connect`, {
    method: "POST",
    cache: "no-store",
    headers: paymentServiceHeaders(input, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      email: input.email,
      refresh_url: input.refreshUrl,
      return_url: input.returnUrl,
    }),
  });
  if (!response.ok) {
    const error = await readPaymentServiceError(response);
    throw new PaymentServiceError(error.message ?? `Stripe Connect request failed with status ${response.status}.`, response.status, error.code);
  }
  const payload = (await response.json()) as StripeConnectResponse;
  return {
    account: mapPaymentAccountSetting(payload.account),
    redirectUrl: payload.redirect_url,
  };
}

export async function refreshStripePaymentAccountSetting(owner: { ownerType: "academy" | "platform"; ownerId: string } & PaymentServiceActor): Promise<PaymentAccountSetting> {
  return postStripePaymentAccountMutation("/v1/payment-accounts/stripe/refresh", owner);
}

export async function disconnectStripePaymentAccountSetting(owner: { ownerType: "academy" | "platform"; ownerId: string } & PaymentServiceActor): Promise<PaymentAccountSetting> {
  return postStripePaymentAccountMutation("/v1/payment-accounts/stripe/disconnect", owner);
}

async function postStripePaymentAccountMutation(path: string, owner: { ownerType: "academy" | "platform"; ownerId: string } & PaymentServiceActor): Promise<PaymentAccountSetting> {
  const response = await fetch(`${paymentServiceUrl()}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: paymentServiceHeaders(owner, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      owner_type: owner.ownerType,
      owner_id: owner.ownerId,
    }),
  });
  if (!response.ok) {
    const error = await readPaymentServiceError(response);
    throw new PaymentServiceError(error.message ?? `Payment account update failed with status ${response.status}.`, response.status, error.code);
  }
  return mapPaymentAccountSetting((await response.json()) as PaymentAccountSettingResponse);
}

async function readPaymentServiceError(response: Response): Promise<{ code?: string; message?: string }> {
  try {
    const body = (await response.json()) as ErrorResponse;
    return {
      code: body.error?.code,
      message: body.error?.message,
    };
  } catch {
    return {};
  }
}

function isProviderBackedPaymentRecord(payment: PaymentRecord) {
  if (payment.provider !== "stripe") return true;
  return typeof payment.providerPaymentId === "string" && payment.providerPaymentId.startsWith("cs_");
}

function mapPaymentAccountSetting(setting: PaymentAccountSettingResponse): PaymentAccountSetting {
  return {
    id: setting.id,
    ownerType: setting.owner_type,
    ownerId: setting.owner_id,
    academyId: setting.academy_id,
    provider: setting.provider,
    providerAccountId: setting.provider_account_id,
    status: setting.status,
    chargesEnabled: setting.charges_enabled,
    payoutsEnabled: setting.payouts_enabled,
    createdAt: setting.created_at,
    updatedAt: setting.updated_at,
  };
}

function paymentServiceHeaders(actor: PaymentServiceActor, base: Record<string, string> = {}) {
  const headers = { ...base };
  if (actor.accessToken) headers.Authorization = `Bearer ${actor.accessToken}`;
  if (actor.actorUserId) headers["X-Actor-User-ID"] = actor.actorUserId;
  if (actor.organisationId) headers["X-Organisation-ID"] = actor.organisationId;
  if (actor.ownerType && actor.ownerId) {
    headers["X-Subscription-Owner-Type"] = actor.ownerType;
    headers["X-Subscription-Owner-ID"] = actor.ownerId;
  }
  return headers;
}
