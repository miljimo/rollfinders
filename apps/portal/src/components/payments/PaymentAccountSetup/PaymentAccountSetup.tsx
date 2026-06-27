import Link from "next/link";
import { Check, ChevronRight, CreditCard } from "lucide-react";
import { clsx } from "clsx";
import type { PaymentAccountSetupProps, PaymentAccountSetupStatus } from "./types";

const statusClassNames: Record<PaymentAccountSetupStatus, string> = {
  active: "border-teal-200 bg-teal-50 text-teal-900",
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  disabled: "border-stone-200 bg-stone-100 text-stone-700",
};

function DefaultProviderIcon() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800 ring-1 ring-teal-100">
      <CreditCard size={23} aria-hidden />
    </span>
  );
}

function CompletionIcon({ complete = true }: { complete?: boolean }) {
  return (
    <span
      className={clsx(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
        complete ? "bg-teal-600 text-white" : "bg-stone-200 text-stone-500",
      )}
      aria-hidden
    >
      <Check size={14} strokeWidth={3} />
    </span>
  );
}

export function PaymentAccountSetup({
  accountLabel = "Connected",
  accountStatusLabel,
  actionHref,
  actionLabel = "Manage Account",
  className,
  detailsHref,
  detailsLabel = "View account details",
  icon,
  items,
  providerName,
  status = "active",
  title = "Account Setup",
  variant = "default",
}: PaymentAccountSetupProps) {
  const displayStatus = accountStatusLabel ?? status;
  const compact = variant === "compact";
  const actionClassName = clsx(
    "inline-flex items-center justify-center rounded-md border border-teal-700 text-sm font-black text-teal-800 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
    compact ? "min-h-9 px-3" : "min-h-11 px-4",
  );

  return (
    <section className={clsx("overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm", className)} aria-labelledby="account-setup-title">
      <div className={clsx("flex items-center justify-between gap-4 border-b border-stone-100", compact ? "p-4" : "p-4 sm:p-5")}>
        <h3 id="account-setup-title" className={clsx("font-black text-slate-950", compact ? "text-lg" : "text-xl")}>{title}</h3>
        <span className={clsx("inline-flex rounded-md border px-3 py-1 text-sm font-bold capitalize", statusClassNames[status])}>
          {displayStatus}
        </span>
      </div>

      <div className={clsx("border-b border-stone-100", compact ? "p-4" : "p-4 sm:p-5")}>
        <div className={clsx("grid gap-4 sm:items-center", compact ? "" : "sm:grid-cols-[1fr_auto]")}>
          <div className="flex min-w-0 items-center gap-4">
            {icon ?? <DefaultProviderIcon />}
            <div className="min-w-0">
              <p className="truncate text-base font-black text-slate-950">{providerName}</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-600">
                <CompletionIcon />
                {accountLabel}
              </p>
            </div>
          </div>
          {actionHref ? (
            <Link href={actionHref} className={actionClassName}>
              {actionLabel}
            </Link>
          ) : (
            <button type="button" className={actionClassName}>
              {actionLabel}
            </button>
          )}
        </div>

        <dl className={clsx("grid", compact ? "mt-4 gap-3" : "mt-5 gap-4")}>
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <CompletionIcon complete={item.complete ?? true} />
              <dt className="min-w-0 truncate text-sm font-bold text-slate-950">{item.label}</dt>
              <dd className="text-sm font-semibold text-slate-600">{item.statusLabel}</dd>
            </div>
          ))}
        </dl>
      </div>

      {detailsHref ? (
        <Link href={detailsHref} className={clsx("flex items-center justify-between gap-3 px-4 text-sm font-black text-teal-800 hover:bg-teal-50", compact ? "min-h-11" : "min-h-14 sm:px-5")}>
          {detailsLabel}
          <ChevronRight size={18} aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}
