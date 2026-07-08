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

export type PaymentOutboxEvent = {
  id: string;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  delivered: boolean;
  attempts: number;
  lastError?: string;
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

type BillingSubscriptionResponse = {
  subscription_id: string;
  client_id: string;
  owner_type: string;
  owner_id: string;
  provider: string;
  provider_subscription_id?: string;
  provider_checkout_id?: string;
  provider_payment_id?: string;
  provider_charge_id?: string;
  provider_invoice_id?: string;
  plan_id: string;
  plan_name: string;
  currency: string;
  amount: number;
  interval: string;
  payment_mode?: string;
  renewal_interval?: string;
  status: string;
  checkout_url?: string;
  metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
};

type BillingSubscriptionListResponse = {
  subscriptions?: BillingSubscriptionResponse[];
  count?: number;
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

type PaymentOutboxEventResponse = {
  id: string;
  event_type: string;
  aggregate_id: string;
  payload?: Record<string, unknown>;
  delivered?: boolean;
  attempts?: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
};

type PaymentOutboxEventsResponse = {
  events?: PaymentOutboxEventResponse[];
  count?: number;
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
  const payments = history.payments.map(mapPaymentRecord).filter(isProviderBackedPaymentRecord);
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

export async function listPaymentTransactionsPage({ accessToken, limit = 10, offset = 0 }: { accessToken?: string; limit?: number; offset?: number } = {}): Promise<PaginatedPayments> {
  const directPayments = await listRollFindersPaymentsPage({ accessToken, limit, offset });
  if (directPayments.payments.length > 0 || directPayments.pagination.has_more) {
    return directPayments;
  }

  const requestedLimit = Math.min(100, Math.max(limit, offset + limit));
  const billingSubscriptions = await listBillingSubscriptionPaymentsPage({ accessToken, limit: requestedLimit, offset: 0 });
  const combined = billingSubscriptions.payments
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const page = combined.slice(offset, offset + limit);
  return {
    payments: page,
    pagination: {
      count: page.length,
      has_more: combined.length > offset + limit || billingSubscriptions.pagination.has_more,
      limit,
      next_offset: offset + page.length,
      offset,
    },
  };
}

async function listRollFindersPaymentsPage({ accessToken, limit = 10, offset = 0 }: { accessToken?: string; limit?: number; offset?: number } = {}): Promise<PaginatedPayments> {
  const params = new URLSearchParams({
    client_id: "rollfinders",
    offset: String(offset),
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
  const payments = history.payments.map(mapPaymentRecord).filter(isProviderBackedPaymentRecord);
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

async function listBillingSubscriptionPaymentsPage({ accessToken, limit = 10, offset = 0 }: { accessToken?: string; limit?: number; offset?: number } = {}): Promise<PaginatedPayments> {
  const params = new URLSearchParams({
    client_id: "rollfinders",
    offset: String(offset),
    limit: String(limit),
  });
  const response = await fetch(`${paymentServiceUrl()}/v1/billing/subscriptions?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    headers: paymentServiceHeaders({ accessToken }),
  });
  if (!response.ok) {
    const error = await readPaymentServiceError(response);
    throw new PaymentServiceError(error.message ?? `Payment service subscription billing request failed with status ${response.status}.`, response.status, error.code);
  }
  const body = (await response.json()) as BillingSubscriptionListResponse;
  const payments = (body.subscriptions ?? []).map(mapBillingSubscriptionPayment);
  return {
    payments,
    pagination: body.pagination ?? {
      count: payments.length,
      has_more: payments.length >= limit,
      limit,
      next_offset: offset + payments.length,
      offset,
    },
  };
}

function mapPaymentRecord(payment: PaymentRecordResponse): PaymentRecord {
  const metadata = payment.metadata ?? {};
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
    checkoutSessionId: payment.checkout_session_id || metadata.provider_checkout_id || metadata.checkout_session_id,
    clientId: payment.client_id || metadata.client_id,
    clientState: payment.client_state || metadata.client_state,
    resourceType: payment.resource_type || metadata.resource_type,
    resourceId: payment.resource_id || metadata.resource_id,
    resourceLabel: payment.resource_label || metadata.resource_label || metadata.plan_name,
    payerUserId: payment.payer_user_id || metadata.payer_user_id,
    payerEmail: payment.payer_email || metadata.payer_email,
  };
}

function mapBillingSubscriptionPayment(subscription: BillingSubscriptionResponse): PaymentRecord {
  const metadata = subscription.metadata ?? {};
  const optionalMetadata = compactMetadata({
    payment_mode: subscription.payment_mode,
    provider_charge_id: subscription.provider_charge_id,
    provider_checkout_id: subscription.provider_checkout_id,
    provider_invoice_id: subscription.provider_invoice_id,
    provider_subscription_id: subscription.provider_subscription_id,
    renewal_interval: subscription.renewal_interval,
  });
  return {
    id: subscription.subscription_id,
    amount: subscription.amount,
    currency: subscription.currency,
    provider: subscription.provider,
    paymentMethodType: "card",
    status: subscription.status,
    refundedAmount: 0,
    metadata: {
      ...metadata,
      ...optionalMetadata,
      billing_interval: subscription.interval,
      owner_id: subscription.owner_id,
      owner_type: subscription.owner_type,
      payment_scope: "SUBSCRIPTION",
      plan_id: subscription.plan_id,
      plan_name: subscription.plan_name,
    },
    providerPaymentId: subscription.provider_payment_id || subscription.provider_subscription_id,
    providerStatus: subscription.status,
    createdAt: subscription.created_at,
    updatedAt: subscription.updated_at,
    checkoutSessionId: subscription.provider_checkout_id || subscription.subscription_id,
    clientId: subscription.client_id,
    resourceType: "subscription",
    resourceId: subscription.plan_id,
    resourceLabel: subscription.plan_name,
  };
}

function compactMetadata(input: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(input).filter((entry): entry is [string, string] => Boolean(entry[1])));
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
  return Boolean(payment.providerPaymentId || payment.checkoutSessionId || payment.id);
}

export async function listPaymentOutboxEvents({
  eventType = "payment.succeeded",
  limit = 50,
}: {
  eventType?: string;
  limit?: number;
} = {}): Promise<PaymentOutboxEvent[]> {
  const params = new URLSearchParams({ event_type: eventType, limit: String(limit) });
  const response = await fetch(`${paymentServiceUrl()}/internal/outbox/events?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await readPaymentServiceError(response);
    throw new PaymentServiceError(error.message ?? `Payment outbox request failed with status ${response.status}.`, response.status, error.code);
  }
  const body = (await response.json()) as PaymentOutboxEventsResponse;
  return (body.events ?? []).map((event) => ({
    id: event.id,
    eventType: event.event_type,
    aggregateId: event.aggregate_id,
    payload: event.payload ?? {},
    delivered: event.delivered ?? false,
    attempts: event.attempts ?? 0,
    lastError: event.last_error,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  }));
}

export async function markPaymentOutboxEventDelivered(eventId: string): Promise<void> {
  const response = await fetch(`${paymentServiceUrl()}/internal/outbox/events/${encodeURIComponent(eventId)}/delivered`, {
    method: "POST",
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await readPaymentServiceError(response);
    throw new PaymentServiceError(error.message ?? `Payment outbox acknowledgement failed with status ${response.status}.`, response.status, error.code);
  }
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
