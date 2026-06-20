"use client";

import { useState } from "react";
import { BookEventButton } from "@/components/BookEventButton";

export function FreeEventBookingButton({ className, priceLabel = "Free" }: { className?: string; priceLabel?: string }) {
  const [booked, setBooked] = useState(false);

  return (
    <BookEventButton
      type="button"
      eventKind="free"
      label={booked ? "Booked" : "Book"}
      priceLabel={booked ? "No payment needed" : priceLabel}
      className={className}
      onClick={() => setBooked(true)}
    />
  );
}
