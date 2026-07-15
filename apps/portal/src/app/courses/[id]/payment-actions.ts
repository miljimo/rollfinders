"use server";

import { createHash, randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { EventPricingType } from "@prisma/client";
import {
  isPublicAcademyBookingVerified,
  isPublicAcademyPaymentsVerified,
  isPublicAcademyTrusted,
} from "@/components/PublicListingWarning";
import { academyPaymentAccountReadiness } from "@/lib/academy-payment-account";
import { authOptions } from "@/lib/auth";
import {
  BookingRecord,
  BookingServiceError,
  createBooking,
  linkBookingPayment,
  listBookings,
} from "@/lib/bookings";
import { getCourseOccurrence } from "@/lib/courses";
import {
  createCourseOccurrenceCheckout,
  PaymentServiceError,
} from "@/lib/payments";

export type CourseCheckoutState = {
  bookingReference?: string;
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
  const digest = createHash("sha256")
    .update(parts.join("\u001f"))
    .digest("hex")
    .slice(0, 32);
  return `course-checkout-${digest}`;
}

function isPaymentServiceUnavailable(error: unknown) {
  if (!(error instanceof TypeError)) return false;
  const cause = (error as { cause?: { code?: string } }).cause;
  return (
    error.message === "fetch failed" ||
    ["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT"].includes(
      cause?.code ?? "",
    )
  );
}

type BookingOwner = {
  customerId?: string;
  guestReference?: string;
};

async function findActiveBookingForOwner({
  bookableId,
  bookableInstanceId,
  bookableType,
  organisationId,
  owner,
}: {
  bookableId: string;
  bookableInstanceId: string;
  bookableType: string;
  organisationId: string;
  owner: BookingOwner;
}) {
  const bookings = await listBookings({
    bookableId,
    bookableInstanceId,
    bookableType,
    customerId: owner.customerId,
    guestReference: owner.guestReference,
    organisationId,
    limit: 50,
  });
  return bookings.find((booking) => {
    const sameOwner = owner.guestReference
      ? booking.guestReference === owner.guestReference
      : booking.customerId === owner.customerId;
    return (
      sameOwner &&
      ["pending", "payment_pending", "confirmed"].includes(booking.status)
    );
  });
}

function duplicateBookingMessage(booking?: BookingRecord) {
  if (booking?.status === "payment_pending") {
    return "A booking is already waiting for payment. Please continue payment from this booking attempt.";
  }
  return "You already have an active booking for this event.";
}

function academyWalletOwnerIds(event: {
  academy: { members: { id: string }[] };
}) {
  return event.academy.members
    .map((member) => (member as { userId?: string }).userId)
    .filter((userId): userId is string => Boolean(userId));
}

export async function startCourseCheckout(
  _state: CourseCheckoutState,
  formData: FormData,
): Promise<CourseCheckoutState> {
  const courseId = String(formData.get("courseId") ?? "");
  const occurrenceDate = String(formData.get("occurrenceDate") ?? "");
  const payerEmail = String(formData.get("payerEmail") ?? "")
    .trim()
    .toLowerCase();
  const donationAmount = String(formData.get("donationAmount") ?? "").trim();
  const attemptId = checkoutAttemptId(formData.get("checkoutAttemptId"));
  if (!courseId)
    return checkoutError(
      "This event could not be found. Refresh the page and try again.",
    );

  const event = await getCourseOccurrence(
    courseId,
    occurrenceDate || undefined,
  );
  if (!event)
    return checkoutError("This event is no longer available for payment.");
  if (!isPublicAcademyTrusted(event.academy))
    return checkoutError("This academy is not verified for online payments.");
  if (!isPublicAcademyBookingVerified(event.academy))
    return checkoutError("This academy is not verified for online bookings.");
  if (!isPublicAcademyPaymentsVerified(event.academy))
    return checkoutError(
      "This academy is not verified to accept online payments.",
    );
  const paymentAccount = await academyPaymentAccountReadiness(
    event.academyId,
    academyWalletOwnerIds(event),
  );
  if (!paymentAccount.ready)
    return checkoutError(
      "This academy has not finished Stripe Connect setup for online payments.",
    );
  if (
    event.pricingType !== EventPricingType.FIXED &&
    event.pricingType !== EventPricingType.DONATION
  ) {
    return checkoutError("This event is not configured for online payment.");
  }

  const amount =
    event.pricingType === EventPricingType.DONATION
      ? amountMinor(donationAmount)
      : amountMinor(event.price);
  if (amount <= 0) {
    return checkoutError(
      event.pricingType === EventPricingType.DONATION
        ? "Enter a donation amount greater than zero."
        : "This event is not configured for online payment.",
    );
  }
  if (payerEmail && !payerEmail.includes("@"))
    return checkoutError("Enter a valid receipt email address.");

  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as
    { id?: string; email?: string | null } | undefined;
  const receiptEmail = payerEmail || sessionUser?.email || undefined;
  if (!sessionUser?.id && !receiptEmail)
    return checkoutError(
      "Enter an email address so the academy knows who is attending.",
    );
  const bookableInstanceId = [
    courseId,
    event.occurrenceDateParam,
    event.startTime,
  ].join(":");

  try {
    let booking: BookingRecord;
    try {
      booking = await createBooking({
        bookableType: "course_occurrence",
        bookableId: courseId,
        bookableInstanceId,
        customerId: sessionUser?.id,
        guestReference: receiptEmail || attemptId,
        organisationId: event.academyId,
        participantCount: 1,
        paymentRequired: true,
        idempotencyKey: checkoutIdempotencyKey([
          "booking",
          courseId,
          event.occurrenceDateParam,
          receiptEmail ?? "",
          attemptId,
        ]),
        metadata: {
          academy_id: event.academyId,
          academy_name: event.academy.name,
          course_id: courseId,
          course_title: event.title,
          occurrence_date: event.occurrenceDateParam,
          occurrence_start_time: event.startTime,
          occurrence_end_time: event.endTime,
          payer_email: receiptEmail ?? "",
          pricing_type: event.pricingType,
        },
      });
    } catch (error) {
      if (!(error instanceof BookingServiceError) || error.status !== 409)
        throw error;
      const existingBooking = await findActiveBookingForOwner({
        bookableType: "course_occurrence",
        bookableId: courseId,
        bookableInstanceId,
        organisationId: event.academyId,
        owner: {
          customerId: sessionUser?.id,
          guestReference: receiptEmail || attemptId,
        },
      });
      if (
        existingBooking?.status !== "payment_pending" ||
        existingBooking.paymentId
      ) {
        return checkoutError(duplicateBookingMessage(existingBooking));
      }
      booking = existingBooking;
    }
    const idempotencyKey = checkoutIdempotencyKey([
      booking.id,
      courseId,
      event.occurrenceDateParam,
      String(amount),
      receiptEmail ?? "",
      attemptId,
    ]);
    const checkout = await createCourseOccurrenceCheckout({
      clientState: `booking:${booking.id}:${attemptId}`,
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
        booking_id: booking.id,
        booking_reference: booking.reference,
        academy_owner_id: event.academy.createdById ?? event.academyId,
        course_title: event.title,
        academy_name: event.academy.name,
        pricing_type: event.pricingType,
        stripe_destination_account: paymentAccount.providerAccountId ?? "",
        ...(event.pricingType === EventPricingType.DONATION
          ? { donation_amount: String(amount) }
          : {}),
      },
    });
    await linkBookingPayment({
      bookingId: booking.id,
      paymentId: checkout.paymentId,
      idempotencyKey: checkoutIdempotencyKey([
        "booking-payment-link",
        booking.id,
        checkout.paymentId,
      ]),
    });
    return { checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    if (isPaymentServiceUnavailable(error)) {
      return checkoutError(
        "Payment service is not available. Your card has not been charged. Please try again later.",
      );
    }
    if (error instanceof PaymentServiceError) {
      if (error.code === "stripe_destination_account_missing") {
        return checkoutError(
          "This academy Stripe account must be reconnected before it can accept payments. Your card has not been charged.",
        );
      }
      return checkoutError(
        `Could not start payment. Payment service returned status ${error.status}. Your card has not been charged.`,
      );
    }
    if (error instanceof BookingServiceError) {
      if (error.status === 409)
        return checkoutError(
          "You already have an active booking for this event. Your card has not been charged.",
        );
      return checkoutError(
        `Could not create booking. Booking service returned status ${error.status}. Your card has not been charged.`,
      );
    }
    return checkoutError(
      "Could not start payment. Your card has not been charged. Please try again.",
    );
  }
}

export async function bookFreeCourseOccurrence(
  _state: CourseCheckoutState,
  formData: FormData,
): Promise<CourseCheckoutState> {
  const courseId = String(formData.get("courseId") ?? "");
  const occurrenceDate = String(formData.get("occurrenceDate") ?? "");
  const payerEmail = String(formData.get("payerEmail") ?? "")
    .trim()
    .toLowerCase();
  const attemptId = checkoutAttemptId(formData.get("checkoutAttemptId"));
  if (!courseId)
    return checkoutError(
      "This event could not be found. Refresh the page and try again.",
    );

  const event = await getCourseOccurrence(
    courseId,
    occurrenceDate || undefined,
  );
  if (!event)
    return checkoutError("This event is no longer available for booking.");
  if (!event.active) return checkoutError("Booking is closed for this event.");
  if (
    !isPublicAcademyTrusted(event.academy) ||
    !isPublicAcademyBookingVerified(event.academy)
  )
    return checkoutError("This academy is not verified for online bookings.");
  if (event.pricingType !== EventPricingType.FREE)
    return checkoutError("This event is not configured as a free booking.");
  if (payerEmail && !payerEmail.includes("@"))
    return checkoutError("Enter a valid booking email address.");

  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as
    { id?: string; email?: string | null } | undefined;
  const attendeeEmail = payerEmail || sessionUser?.email || undefined;
  if (!sessionUser?.id && !attendeeEmail)
    return checkoutError(
      "Enter an email address so the academy knows who is attending.",
    );

  const bookableInstanceId = [
    courseId,
    event.occurrenceDateParam,
    event.startTime,
  ].join(":");

  try {
    let booking: BookingRecord;
    try {
      booking = await createBooking({
        bookableType: "course_occurrence",
        bookableId: courseId,
        bookableInstanceId,
        customerId: sessionUser?.id,
        guestReference: attendeeEmail,
        organisationId: event.academyId,
        participantCount: 1,
        paymentRequired: false,
        idempotencyKey: checkoutIdempotencyKey([
          "free-booking",
          courseId,
          event.occurrenceDateParam,
          attendeeEmail ?? "",
          attemptId,
        ]),
        metadata: {
          academy_id: event.academyId,
          academy_name: event.academy.name,
          course_id: courseId,
          course_title: event.title,
          occurrence_date: event.occurrenceDateParam,
          occurrence_start_time: event.startTime,
          occurrence_end_time: event.endTime,
          payer_email: attendeeEmail ?? "",
          pricing_type: event.pricingType,
        },
      });
    } catch (error) {
      if (!(error instanceof BookingServiceError) || error.status !== 409)
        throw error;
      const existingBooking = await findActiveBookingForOwner({
        bookableType: "course_occurrence",
        bookableId: courseId,
        bookableInstanceId,
        organisationId: event.academyId,
        owner: { customerId: sessionUser?.id, guestReference: attendeeEmail },
      });
      if (!existingBooking) throw error;
      booking = existingBooking;
    }

    return { bookingReference: booking.reference };
  } catch (error) {
    if (error instanceof BookingServiceError) {
      if (error.status === 409)
        return checkoutError(
          "You already have an active booking for this event.",
        );
      return checkoutError(
        `Could not create booking. Booking service returned status ${error.status}.`,
      );
    }
    return checkoutError("Could not create booking. Please try again.");
  }
}
