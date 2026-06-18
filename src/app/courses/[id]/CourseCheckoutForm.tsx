"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/Button";
import { startCourseCheckout, type CourseCheckoutState } from "./payment-actions";

const courseCheckoutInitialState: CourseCheckoutState = {};

export function CourseCheckoutForm({
  courseId,
  occurrenceDate,
  mode = "fixed",
  suggestedAmount,
}: {
  courseId: string;
  occurrenceDate: string;
  mode?: "fixed" | "donation";
  suggestedAmount?: number;
}) {
  const [state, formAction, pending] = useActionState(startCourseCheckout, courseCheckoutInitialState);
  const defaultDonationAmount = suggestedAmount && suggestedAmount > 0 ? suggestedAmount.toFixed(2) : "";
  const formClassName = mode === "donation" ? "mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" : "mt-4 grid gap-3 sm:grid-cols-[1fr_auto]";

  useEffect(() => {
    if (!state.checkoutUrl) return;
    window.location.href = state.checkoutUrl;
  }, [state.checkoutUrl]);

  return (
    <form action={formAction} className={formClassName}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="occurrenceDate" value={occurrenceDate} />
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-white p-3 text-sm font-semibold text-red-700 sm:col-span-2" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.checkoutUrl ? (
        <p className="rounded-md border border-teal-200 bg-white p-3 text-sm font-semibold text-teal-800 sm:col-span-2" aria-live="polite">
          Checkout created. Redirecting to Stripe...
        </p>
      ) : null}
      {mode === "donation" ? (
        <label className="grid gap-1 text-sm font-bold text-stone-800">
          Donation amount <span className="text-xs font-semibold text-stone-500">GBP</span>
          <input
            name="donationAmount"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="10.00"
            defaultValue={defaultDonationAmount}
            required
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm font-normal"
          />
        </label>
      ) : null}
      <label className="grid gap-1 text-sm font-bold text-stone-800">
        Receipt email <span className="text-xs font-semibold text-stone-500">Optional</span>
        <input name="payerEmail" type="email" placeholder="you@example.com" className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm font-normal" />
      </label>
      <div className="flex items-end">
        <Button type="submit" variant="primary" disabled={pending || Boolean(state.checkoutUrl)}>
          {pending || state.checkoutUrl ? "Creating checkout..." : mode === "donation" ? "Donate" : "Continue to Secure Payment"}
        </Button>
      </div>
    </form>
  );
}
