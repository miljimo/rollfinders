"use server";

import { createHash, randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { EventPricingType } from "@prisma/client";
import { isPublicAcademyTrusted } from "@/components/PublicListingWarning";
import { academyPaymentAccountReadiness } from "@/lib/academy-payment-account";
import { authOptions } from "@/lib/auth";
import { getCourseOccurrence } from "@/lib/courses";
import { createCourseOccurrenceCheckout, PaymentServiceError } from "@/lib/payments";

export type CourseCheckoutState = {
  checkoutUrl?: string;
  error?: string;
};

function amountMinor(price: unknown) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

function checkoutError(message: string): CourseCheckoutState {
  return { error: message };
}

function checkoutAttemptId(value: FormDataEntryValue | null) {
  const candidate = String(value ?? "").trim();
  if (/^[A-Za-z0-9_-]{8,80}$/.test(candidate)) return candidate;
  return randomUUID();
}

function checkoutIdempotencyKey(parts: string[]) {
  const digest = createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
  return `course-checkout-${digest}`;
}

function isPaymentServiceUnavailable(error: unknown) {
  if (!(error instanceof TypeError)) return false;
  const cause = (error as { cause?: { code?: string } }).cause;
  return error.message === "fetch failed" || ["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT"].includes(cause?.code ?? "");
}

export async function startCourseCheckout(_state: CourseCheckoutState, formData: FormData): Promise<CourseCheckoutState> {
  const courseId = String(formData.get("courseId") ?? "");
  const occurrenceDate = String(formData.get("occurrenceDate") ?? "");
  const payerEmail = String(formData.get("payerEmail") ?? "").trim().toLowerCase();
  const donationAmount = String(formData.get("donationAmount") ?? "").trim();
  const attemptId = checkoutAttemptId(formData.get("checkoutAttemptId"));
  if (!courseId) return checkoutError("This event could not be found. Refresh the page and try again.");

  const event = await getCourseOccurrence(courseId, occurrenceDate || undefined);
  if (!event) return checkoutError("This event is no longer available for payment.");
  if (!isPublicAcademyTrusted(event.academy)) return checkoutError("This academy is not verified for online payments.");
  const paymentAccount = await academyPaymentAccountReadiness(event.academyId);
  if (!paymentAccount.ready) return checkoutError("This academy has not finished Stripe Connect setup for online payments.");
  if (event.pricingType !== EventPricingType.FIXED && event.pricingType !== EventPricingType.DONATION) {
    return checkoutError("This event is not configured for online payment.");
  }

  const amount = event.pricingType === EventPricingType.DONATION ? amountMinor(donationAmount) : amountMinor(event.price);
  if (amount <= 0) {
    return checkoutError(event.pricingType === EventPricingType.DONATION ? "Enter a donation amount greater than zero." : "This event is not configured for online payment.");
  }
  if (payerEmail && !payerEmail.includes("@")) return checkoutError("Enter a valid receipt email address.");

  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; email?: string | null } | undefined;
  const receiptEmail = payerEmail || sessionUser?.email || undefined;

  try {
    const idempotencyKey = checkoutIdempotencyKey([
      courseId,
      event.occurrenceDateParam,
      String(amount),
      receiptEmail ?? "",
      attemptId,
    ]);
    const checkout = await createCourseOccurrenceCheckout({
      clientState: `${courseId}:${event.occurrenceDateParam}:${attemptId}`,
      courseId,
      academyId: event.academyId,
      occurrenceDate: event.occurrenceDateParam,
      occurrenceStartTime: event.startTime,
      occurrenceEndTime: event.endTime,
      amountMinor: amount,
      currency: "GBP",
      provider: "stripe",
      paymentMethodType: "card",
      payerUserId: sessionUser?.id,
      payerEmail: receiptEmail,
      idempotencyKey,
      metadata: {
        course_title: event.title,
        academy_name: event.academy.name,
        pricing_type: event.pricingType,
        ...(event.pricingType === EventPricingType.DONATION ? { donation_amount: String(amount) } : {}),
      },
    });
    return { checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    if (isPaymentServiceUnavailable(error)) {
      return checkoutError("Payment service is not available. Your card has not been charged. Please try again later.");
    }
    if (error instanceof PaymentServiceError) {
      return checkoutError(`Could not start payment. Payment service returned status ${error.status}. Your card has not been charged.`);
    }
    return checkoutError("Could not start payment. Your card has not been charged. Please try again.");
  }
}
