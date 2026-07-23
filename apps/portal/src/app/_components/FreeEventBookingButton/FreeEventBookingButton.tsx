"use client";

import { useActionState, useState } from "react";
import { BookEventButton } from "@/app/_components/BookEventButton";
import type { CourseCheckoutState } from "@/app/courses/[id]/payment-actions";

const initialState: CourseCheckoutState = {};

export function FreeEventBookingButton({
  action,
  className,
  courseId,
  occurrenceDate,
  priceLabel = "Free",
}: {
  action: (state: CourseCheckoutState, formData: FormData) => Promise<CourseCheckoutState>;
  className?: string;
  courseId: string;
  occurrenceDate: string;
  priceLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [bookingAttemptId] = useState(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });
  const booked = Boolean(state.bookingReference);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="occurrenceDate" value={occurrenceDate} />
      <input type="hidden" name="checkoutAttemptId" value={bookingAttemptId} />
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-white p-3 text-sm font-semibold text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {booked ? (
        <p className="rounded-md border border-teal-200 bg-white p-3 text-sm font-semibold text-teal-800" aria-live="polite">
          Booking confirmed{state.bookingReference ? `: ${state.bookingReference}` : ""}.
        </p>
      ) : (
        <label className="grid gap-1 text-sm font-bold text-stone-800">
          Booking email <span className="text-xs font-semibold text-stone-500">Required for guests</span>
          <input name="payerEmail" type="email" placeholder="you@example.com" className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm font-normal" />
        </label>
      )}
      <p className="text-center text-sm font-semibold text-stone-700">{booked ? "No payment needed" : priceLabel}</p>
      <BookEventButton
        type="submit"
        disabled={booked}
        eventKind="free"
        label={booked ? "Booked" : "Book"}
        loading={pending}
        loadingLabel="Booking..."
        className={className}
      />
    </form>
  );
}
