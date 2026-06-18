"use server";

import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { EventPricingType } from "@prisma/client";
import { isPublicAcademyTrusted } from "@/components/PublicListingWarning";
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

export async function startCourseCheckout(_state: CourseCheckoutState, formData: FormData): Promise<CourseCheckoutState> {
  const courseId = String(formData.get("courseId") ?? "");
  const occurrenceDate = String(formData.get("occurrenceDate") ?? "");
  const payerEmail = String(formData.get("payerEmail") ?? "").trim().toLowerCase();
  const donationAmount = String(formData.get("donationAmount") ?? "").trim();
  if (!courseId) return checkoutError("This event could not be found. Refresh the page and try again.");

  const event = await getCourseOccurrence(courseId, occurrenceDate || undefined);
  if (!event) return checkoutError("This event is no longer available for payment.");
  if (!isPublicAcademyTrusted(event.academy)) return checkoutError("This academy is not verified for online payments.");
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
    const checkout = await createCourseOccurrenceCheckout({
      clientState: `${courseId}:${event.occurrenceDateParam}:${randomUUID()}`,
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
      idempotencyKey: `course-${courseId}-${event.occurrenceDateParam}-${randomUUID()}`,
      metadata: {
        course_title: event.title,
        academy_name: event.academy.name,
        pricing_type: event.pricingType,
        ...(event.pricingType === EventPricingType.DONATION ? { donation_amount: String(amount) } : {}),
      },
    });
    return { checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return checkoutError(`Could not start payment. Payment service returned status ${error.status}. Your card has not been charged.`);
    }
    return checkoutError("Could not start payment. Your card has not been charged. Please try again.");
  }
}
