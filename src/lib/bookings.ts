// import "server-only";

import { getEnvVariable } from "./environments";

if (typeof window !== "undefined") {
  throw new Error("Booking service calls are server-only.");
}

export type BookingRecord = {
  id: string;
  reference: string;
  bookableType: string;
  bookableId: string;
  bookableInstanceId: string;
  customerId?: string;
  guestReference?: string;
  organisationId: string;
  paymentId?: string;
  status: string;
  participantCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookingInput = {
  bookableType: string;
  bookableId: string;
  bookableInstanceId: string;
  customerId?: string;
  guestReference?: string;
  organisationId: string;
  participantCount?: number;
  paymentRequired?: boolean;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
};

type BookingRecordResponse = {
  id: string;
  reference: string;
  bookable_type: string;
  bookable_id: string;
  bookable_instance_id: string;
  customer_id?: string;
  guest_reference?: string;
  organisation_id: string;
  payment_id?: string;
  status: string;
  participant_count: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type BookingListResponse = {
  items: BookingRecordResponse[];
  count: number;
};

const bookingServiceUrl = () => getEnvVariable("BOOKING_PUBLIC_BASE_URL", "http://localhost:3005").replace(/\/+$/, "");

export class BookingServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BookingServiceError";
  }
}

export async function listBookings({
  bookableId,
  bookableInstanceId,
  bookableType,
  customerId,
  guestReference,
  organisationId,
  status,
  limit = 100,
}: {
  bookableId?: string | null;
  bookableInstanceId?: string | null;
  bookableType?: string | null;
  customerId?: string | null;
  guestReference?: string | null;
  organisationId?: string | null;
  status?: string | null;
  limit?: number;
} = {}): Promise<BookingRecord[]> {
  const params = new URLSearchParams({ page_size: String(limit) });
  if (bookableId) params.set("bookable_id", bookableId);
  if (bookableInstanceId) params.set("bookable_instance_id", bookableInstanceId);
  if (bookableType) params.set("bookable_type", bookableType);
  if (customerId) params.set("customer_id", customerId);
  if (guestReference) params.set("guest_reference", guestReference);
  if (organisationId) params.set("organisation_id", organisationId);
  if (status) params.set("status", status);

  const response = await fetch(`${bookingServiceUrl()}/v1/bookings?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new BookingServiceError(`Booking service history request failed with status ${response.status}.`, response.status);
  }

  const history = (await response.json()) as BookingListResponse;
  return history.items.map(bookingFromResponse);
}

export async function createBooking(input: CreateBookingInput): Promise<BookingRecord> {
  const response = await fetch(`${bookingServiceUrl()}/v1/bookings`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      bookable_type: input.bookableType,
      bookable_id: input.bookableId,
      bookable_instance_id: input.bookableInstanceId,
      customer_id: input.customerId,
      guest_reference: input.guestReference,
      organisation_id: input.organisationId,
      participant_count: input.participantCount ?? 1,
      payment_required: input.paymentRequired ?? false,
      metadata: input.metadata ?? {},
    }),
  });

  if (!response.ok) {
    throw new BookingServiceError(`Booking service creation failed with status ${response.status}.`, response.status);
  }

  return bookingFromResponse((await response.json()) as BookingRecordResponse);
}

export async function getBooking(bookingId: string): Promise<BookingRecord> {
  const response = await fetch(`${bookingServiceUrl()}/v1/bookings/${encodeURIComponent(bookingId)}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new BookingServiceError(`Booking service get request failed with status ${response.status}.`, response.status);
  }

  return bookingFromResponse((await response.json()) as BookingRecordResponse);
}

export async function linkBookingPayment({
  bookingId,
  idempotencyKey,
  paymentId,
}: {
  bookingId: string;
  idempotencyKey: string;
  paymentId: string;
}): Promise<BookingRecord> {
  const response = await fetch(`${bookingServiceUrl()}/v1/bookings/${encodeURIComponent(bookingId)}/payment-link`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ payment_id: paymentId }),
  });

  if (!response.ok) {
    throw new BookingServiceError(`Booking service payment link failed with status ${response.status}.`, response.status);
  }

  return bookingFromResponse((await response.json()) as BookingRecordResponse);
}

export async function confirmBooking({
  bookingId,
  idempotencyKey,
  reason,
}: {
  bookingId: string;
  idempotencyKey: string;
  reason?: string;
}): Promise<BookingRecord> {
  const response = await fetch(`${bookingServiceUrl()}/v1/bookings/${encodeURIComponent(bookingId)}/confirm`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ reason: reason ?? "payment_succeeded" }),
  });

  if (!response.ok) {
    throw new BookingServiceError(`Booking service confirmation failed with status ${response.status}.`, response.status);
  }

  return bookingFromResponse((await response.json()) as BookingRecordResponse);
}

export async function cancelBooking({
  bookingId,
  idempotencyKey,
  reason,
}: {
  bookingId: string;
  idempotencyKey: string;
  reason?: string;
}): Promise<BookingRecord> {
  const response = await fetch(`${bookingServiceUrl()}/v1/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ reason: reason ?? "booking_cancelled" }),
  });

  if (!response.ok) {
    throw new BookingServiceError(`Booking service cancellation failed with status ${response.status}.`, response.status);
  }

  return bookingFromResponse((await response.json()) as BookingRecordResponse);
}

export async function markBookingPaymentReceived({
  bookingId,
  idempotencyKey,
  reason,
}: {
  bookingId: string;
  idempotencyKey: string;
  reason?: string;
}): Promise<BookingRecord> {
  const response = await fetch(`${bookingServiceUrl()}/v1/bookings/${encodeURIComponent(bookingId)}/payment-received`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ reason: reason ?? "payment_received" }),
  });

  if (!response.ok) {
    throw new BookingServiceError(`Booking service payment received update failed with status ${response.status}.`, response.status);
  }

  return bookingFromResponse((await response.json()) as BookingRecordResponse);
}

function bookingFromResponse(booking: BookingRecordResponse): BookingRecord {
  return {
    id: booking.id,
    reference: booking.reference,
    bookableType: booking.bookable_type,
    bookableId: booking.bookable_id,
    bookableInstanceId: booking.bookable_instance_id,
    customerId: booking.customer_id,
    guestReference: booking.guest_reference,
    organisationId: booking.organisation_id,
    paymentId: booking.payment_id,
    status: booking.status,
    participantCount: booking.participant_count,
    metadata: booking.metadata,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
  };
}
