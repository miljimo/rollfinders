import Link from "next/link";
import { Check, ChevronRight, CreditCard } from "lucide-react";
import { clsx } from "clsx";
import type { AccountSetupProps, AccountSetupStatus } from "./types";

const statusClassNames: Record<AccountSetupStatus, string> = {
  active: "border-teal-200 bg-teal-50 text-teal-900",
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  disabled: "border-stone-200 bg-stone-100 text-stone-700",
};

function DefaultProviderIcon() {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800 ring-1 ring-teal-100">
      <CreditCard size={28} aria-hidden />
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

export function AccountSetup({
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
}: AccountSetupProps) {
  const displayStatus = accountStatusLabel ?? status;
  const actionClassName = "inline-flex min-h-11 items-center justify-center rounded-md border border-teal-700 px-4 text-sm font-black text-teal-800 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

  return (
    <section className={clsx("overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm", className)} aria-labelledby="account-setup-title">
      <div className="flex items-center justify-between gap-4 border-b border-stone-100 p-4 sm:p-5">
        <h3 id="account-setup-title" className="text-xl font-black text-slate-950">{title}</h3>
        <span className={clsx("inline-flex rounded-md border px-3 py-1 text-sm font-bold capitalize", statusClassNames[status])}>
          {displayStatus}
        </span>
      </div>

      <div className="border-b border-stone-100 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
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

        <dl className="mt-5 grid gap-4">
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
        <Link href={detailsHref} className="flex min-h-14 items-center justify-between gap-3 px-4 text-sm font-black text-teal-800 hover:bg-teal-50 sm:px-5">
          {detailsLabel}
          <ChevronRight size={18} aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}
