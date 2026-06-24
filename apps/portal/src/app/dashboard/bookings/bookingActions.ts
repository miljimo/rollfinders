"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole, isSuperAdminRole } from "@/lib/admin";
import { cancelBooking, confirmBooking, getBooking, type BookingRecord } from "@/lib/bookings";
import { cancelPayment, createPaymentRefund, PaymentServiceError } from "@/lib/payments";

function dashboardRedirect(error?: string, bookingId?: string): never {
  const params = new URLSearchParams({ panel: "bookings" });
  if (error) params.set("bookingActionError", error);
  if (bookingId) params.set("bookingActionBookingId", bookingId);
  redirect(`/dashboard?${params.toString()}`);
}

export async function confirmDashboardBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "").trim();
  if (!bookingId) dashboardRedirect("booking-missing");

  const currentUser = await getCurrentUser();
  const role = currentUser?.role;
  if (!role || (!isSuperAdminRole(role) && !isPlatformAdminRole(role) && !isAcademyAdminRole(role))) {
    dashboardRedirect("forbidden", bookingId);
  }

  if (isAcademyAdminRole(role)) {
    let booking: BookingRecord;
    try {
      booking = await getBooking(bookingId);
    } catch {
      dashboardRedirect("booking-load-failed", bookingId);
    }
    if (!currentUser?.academyId || booking.organisationId !== currentUser.academyId) {
      dashboardRedirect("forbidden", bookingId);
    }
  }

  try {
    await confirmBooking({
      bookingId,
      idempotencyKey: `dashboard-confirm:${bookingId}:${currentUser?.id ?? "admin"}`,
      reason: "academy_confirmed",
    });
  } catch {
    dashboardRedirect("confirm-failed", bookingId);
  }

  revalidatePath("/dashboard");
  dashboardRedirect();
}

export async function cancelDashboardBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "").trim();
  if (!bookingId) dashboardRedirect("booking-missing");

  const currentUser = await getCurrentUser();
  const role = currentUser?.role;
  if (!role || (!isSuperAdminRole(role) && !isPlatformAdminRole(role) && !isAcademyAdminRole(role))) {
    dashboardRedirect("forbidden", bookingId);
  }

  let booking: BookingRecord;
  try {
    booking = await getBooking(bookingId);
  } catch {
    dashboardRedirect("booking-load-failed", bookingId);
  }
  assertBookingAccess(booking, currentUser?.academyId, role);
  if (booking.status !== "payment_pending" && booking.status !== "payment_received") {
    dashboardRedirect("cancel-invalid-status", bookingId);
  }

  if (booking.status === "payment_received" && !booking.paymentId) {
    dashboardRedirect("refund-missing-payment", bookingId);
  }

  let redirectCode: string | undefined;
  try {
    if (booking.status === "payment_received" && booking.paymentId) {
      await createPaymentRefund({
        paymentId: booking.paymentId,
        idempotencyKey: `dashboard-refund-payment:${booking.paymentId}:${currentUser?.id ?? "admin"}`,
        reason: "booking_cancelled_by_academy",
      });
      await cancelBooking({
        bookingId,
        idempotencyKey: `dashboard-cancel-refunded-booking:${bookingId}:${currentUser?.id ?? "admin"}`,
        reason: "refund_requested_by_academy",
      });
      redirectCode = "refund-requested";
    }

    if (booking.status === "payment_pending" && booking.paymentId) {
      const payment = await cancelPayment({
        paymentId: booking.paymentId,
        idempotencyKey: `dashboard-cancel-payment:${booking.paymentId}:${currentUser?.id ?? "admin"}`,
      });
      if (payment.status !== "cancelled") {
        redirectCode = "payment-already-complete";
      }
    }
    if (booking.status === "payment_pending" && redirectCode !== "payment-already-complete") {
      await cancelBooking({
        bookingId,
        idempotencyKey: `dashboard-cancel-booking:${bookingId}:${currentUser?.id ?? "admin"}`,
        reason: booking.paymentId ? "payment_cancelled_by_academy" : "booking_cancelled_by_academy",
      });
    }
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      if (error.code === "payment_already_completed") {
        dashboardRedirect("payment-already-complete", bookingId);
      }
      if (booking.status === "payment_received") {
        dashboardRedirect("refund-request-failed", bookingId);
      }
      dashboardRedirect("payment-cancel-failed", bookingId);
    }
    dashboardRedirect("cancel-failed", bookingId);
  }

  revalidatePath("/dashboard");
  dashboardRedirect(redirectCode, redirectCode ? bookingId : undefined);
}

function assertBookingAccess(booking: BookingRecord, academyId: string | null | undefined, role: string) {
  if (!isAcademyAdminRole(role)) return;
  if (!academyId || booking.organisationId !== academyId) {
    dashboardRedirect("forbidden", booking.id);
  }
}
