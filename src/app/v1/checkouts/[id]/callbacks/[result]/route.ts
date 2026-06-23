import { NextResponse } from "next/server";
import { markBookingPaymentReceived } from "@/lib/bookings";
import { apiGatewayUrl } from "@/lib/apiGateway";

export const dynamic = "force-dynamic";

const paymentServiceUrl = apiGatewayUrl;

function successfulPayment(result: string, status: string | null) {
  return result === "success" && ["paid", "succeeded", "completed"].includes(String(status ?? "").toLowerCase());
}

function bookingIdFromRedirect(location: string) {
  const redirectUrl = new URL(location);
  const metadataBookingId = redirectUrl.searchParams.get("metadata_booking_id");
  if (metadataBookingId) return metadataBookingId;

  const state = redirectUrl.searchParams.get("state") ?? "";
  const match = /^booking:([^:]+):/.exec(state);
  return match?.[1] ?? "";
}

async function confirmPaidBooking(location: string, result: string) {
  const redirectUrl = new URL(location);
  const paymentStatus = redirectUrl.searchParams.get("payment_status");
  if (!successfulPayment(result, paymentStatus)) return redirectUrl;

  const bookingId = bookingIdFromRedirect(location);
  const paymentId = redirectUrl.searchParams.get("payment_id") ?? "";
  if (!bookingId || !paymentId) return redirectUrl;

  try {
    await markBookingPaymentReceived({
      bookingId,
      idempotencyKey: `payment-callback-received:${paymentId}:${bookingId}`,
      reason: `payment_received:${paymentId}`,
    });
    redirectUrl.searchParams.set("booking_status", "payment_received");
  } catch (error) {
    console.error("Payment succeeded but booking payment-received update failed.", { bookingId, error, paymentId });
    redirectUrl.searchParams.set("booking_payment_received", "failed");
  }
  return redirectUrl;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; result: string }> },
) {
  const { id, result } = await params;
  const incoming = new URL(request.url);
  const callbackUrl = new URL(
    `/v1/checkouts/${encodeURIComponent(id)}/callbacks/${encodeURIComponent(result)}`,
    paymentServiceUrl(),
  );
  callbackUrl.search = incoming.search;

  const response = await fetch(callbackUrl, {
    method: "GET",
    cache: "no-store",
    redirect: "manual",
  });

  const location = response.headers.get("location");
  if (location && response.status >= 300 && response.status < 400) {
    const redirectUrl = await confirmPaidBooking(location, result);
    return NextResponse.redirect(redirectUrl, response.status);
  }

  const body = await response.text();
  return new Response(body || "Payment callback failed.", {
    status: response.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": response.headers.get("content-type") ?? "text/plain; charset=utf-8",
    },
  });
}
