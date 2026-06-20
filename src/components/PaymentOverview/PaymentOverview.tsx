import { ChevronDown, Info } from "lucide-react";
import { clsx } from "clsx";
import { LineOverviewChart } from "@/components/LineOverviewChart";
import type { PaymentOverviewProps } from "./types";

function formatCurrencyTick(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value / 100);
}

export function PaymentOverview({
  chartPoints,
  className,
  currency = "GBP",
  metrics,
  periodLabel = "Daily",
  title = "Payments Overview",
}: PaymentOverviewProps) {
  return (
    <section className={clsx("rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5", className)} aria-labelledby="payment-overview-title">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3 id="payment-overview-title" className="truncate text-lg font-black text-slate-950">{title}</h3>
          <Info size={17} className="shrink-0 text-slate-400" aria-hidden />
        </div>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm"
          type="button"
        >
          {periodLabel}
          <ChevronDown size={16} aria-hidden />
        </button>
      </div>

      <LineOverviewChart
        className="mt-3"
        formatValue={(value) => formatCurrencyTick(value, currency)}
        id="payment-overview-chart"
        maxTicks={5}
        maxValue={30000}
        points={chartPoints}
        title={title}
      />

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="grid grid-cols-[auto_1fr] gap-x-3">
            <dt className="col-start-2 text-sm font-bold text-slate-500">{metric.label}</dt>
            <dd className="col-start-2 row-start-1 text-xl font-black text-slate-950">{metric.value}</dd>
            <span className={clsx("row-span-2 mt-2 h-2.5 w-2.5 rounded-full", metric.colorClassName ?? "bg-teal-700")} aria-hidden />
          </div>
        ))}
      </dl>
    </section>
  );
}
