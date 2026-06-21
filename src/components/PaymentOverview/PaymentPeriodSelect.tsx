"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

export type PaymentPeriodOption = {
  label: string;
  value: string;
};

type PaymentPeriodSelectProps = {
  options: PaymentPeriodOption[];
  value: string;
};

export function PaymentPeriodSelect({ options, value }: PaymentPeriodSelectProps) {
  const router = useRouter();

  return (
    <label className="relative inline-flex">
      <span className="sr-only">Select payment overview period</span>
      <select
        aria-label="Payment overview period"
        className="min-h-11 appearance-none rounded-md border border-stone-200 bg-white py-2 pl-4 pr-10 text-sm font-black text-slate-700 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
        onChange={(event) => {
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set("panel", "payments");
          nextUrl.searchParams.set("paymentsView", "overview");
          nextUrl.searchParams.set("paymentsPeriod", event.target.value);
          router.push(`${nextUrl.pathname}${nextUrl.search}`);
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} aria-hidden />
    </label>
  );
}
