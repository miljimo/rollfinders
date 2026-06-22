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

const bookingServiceUrl = () => getEnvVariable("BOOKING_SERVICE_URL", "http://localhost:3005").replace(/\/+$/, "");
const bookingServiceApiKey = () => getEnvVariable("BOOKING_SERVICE_API_KEY", "");

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
  organisationId,
  limit = 100,
}: {
  organisationId?: string | null;
  limit?: number;
} = {}): Promise<BookingRecord[]> {
  const apiKey = bookingServiceApiKey();
  if (!apiKey) {
    throw new BookingServiceError("Booking service API key is not configured.", 0);
  }

  const params = new URLSearchParams({ page_size: String(limit) });
  if (organisationId) params.set("organisation_id", organisationId);

  const response = await fetch(`${bookingServiceUrl()}/v1/bookings?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new BookingServiceError(`Booking service history request failed with status ${response.status}.`, response.status);
  }

  const history = (await response.json()) as BookingListResponse;
  return history.items.map(bookingFromResponse);
}

export async function createBooking(input: CreateBookingInput): Promise<BookingRecord> {
  const apiKey = bookingServiceApiKey();
  if (!apiKey) {
    throw new BookingServiceError("Booking service API key is not configured.", 0);
  }

  const response = await fetch(`${bookingServiceUrl()}/v1/bookings`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

export async function linkBookingPayment({
  bookingId,
  idempotencyKey,
  paymentId,
}: {
  bookingId: string;
  idempotencyKey: string;
  paymentId: string;
}): Promise<BookingRecord> {
  const apiKey = bookingServiceApiKey();
  if (!apiKey) {
    throw new BookingServiceError("Booking service API key is not configured.", 0);
  }

  const response = await fetch(`${bookingServiceUrl()}/v1/bookings/${encodeURIComponent(bookingId)}/payment-link`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
