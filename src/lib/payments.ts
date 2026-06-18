// import "server-only";

import { getEnvVariable } from "./environments";

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
};

const paymentServiceUrl = () => getEnvVariable("PAYMENT_SERVICE_URL", "http://localhost:3002").replace(/\/+$/, "");
const paymentServiceApiKey = () => getEnvVariable("PAYMENT_SERVICE_API_KEY", "");

export class PaymentServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

export async function createCourseOccurrenceCheckout(
  input: CreateCourseOccurrenceCheckoutInput,
): Promise<CourseOccurrenceCheckout> {
  const apiKey = paymentServiceApiKey();
  if (!apiKey) {
    throw new PaymentServiceError("Payment service API key is not configured.", 0);
  }

  const response = await fetch(`${paymentServiceUrl()}/v1/checkouts`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    throw new PaymentServiceError(`Payment service checkout creation failed with status ${response.status}.`, response.status);
  }

  const checkout = (await response.json()) as CheckoutResponse;
  return {
    checkoutSessionId: checkout.checkout_session_id,
    checkoutUrl: checkout.checkout_url,
    paymentId: checkout.payment_id,
    expiresAt: checkout.expires_at,
  };
}

export async function listCourseOccurrencePayments({ limit = 100 }: { limit?: number } = {}): Promise<PaymentRecord[]> {
  const apiKey = paymentServiceApiKey();
  if (!apiKey) {
    throw new PaymentServiceError("Payment service API key is not configured.", 0);
  }
  const params = new URLSearchParams({
    client_id: "rollfinders",
    resource_type: "course_occurrence",
    limit: String(limit),
  });
  const response = await fetch(`${paymentServiceUrl()}/v1/payments?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!response.ok) {
    throw new PaymentServiceError(`Payment service history request failed with status ${response.status}.`, response.status);
  }
  const history = (await response.json()) as PaymentHistoryResponse;
  return history.payments.map((payment) => ({
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
}

function isProviderBackedPaymentRecord(payment: PaymentRecord) {
  if (payment.provider !== "stripe") return true;
  return typeof payment.providerPaymentId === "string" && payment.providerPaymentId.startsWith("cs_");
}
