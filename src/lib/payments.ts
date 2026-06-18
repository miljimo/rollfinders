import "server-only";

import { getEnvVariable } from "./environments";

type PaymentProvider = "stripe" | "paypal";
type PaymentMethodType = "card" | "paypal";

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

export type CourseOccurrenceCheckout = {
  checkoutSessionId: string;
  checkoutUrl: string;
  paymentId: string;
  expiresAt: string;
};

type CourseOccurrenceCheckoutResponse = {
  checkout_session_id: string;
  client_id: string;
  client_state?: string;
  checkout_url: string;
  payment_id: string;
  expires_at: string;
};

const paymentServiceUrl = () => getEnvVariable("PAYMENT_SERVICE_URL", "http://localhost:8080").replace(/\/+$/, "");
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

  const response = await fetch(`${paymentServiceUrl()}/v1/course-occurrence-checkouts`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      course_id: input.courseId,
      client_id: input.clientId ?? "rollfinders",
      client_state: input.clientState,
      academy_id: input.academyId,
      occurrence_date: input.occurrenceDate,
      occurrence_start_time: input.occurrenceStartTime,
      occurrence_end_time: input.occurrenceEndTime,
      amount: input.amountMinor,
      currency: input.currency,
      provider: input.provider,
      payment_method_type: input.paymentMethodType,
      payer_user_id: input.payerUserId,
      payer_email: input.payerEmail,
      metadata: {
        source: "rollfinders",
        payment_scope: "COURSE_OCCURRENCE",
        ...input.metadata,
      },
    }),
  });

  if (!response.ok) {
    throw new PaymentServiceError("Payment service checkout creation failed.", response.status);
  }

  const checkout = (await response.json()) as CourseOccurrenceCheckoutResponse;
  return {
    checkoutSessionId: checkout.checkout_session_id,
    checkoutUrl: checkout.checkout_url,
    paymentId: checkout.payment_id,
    expiresAt: checkout.expires_at,
  };
}
