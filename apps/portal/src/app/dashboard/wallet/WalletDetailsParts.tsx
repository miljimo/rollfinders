import type { ReactNode } from "react";
import { clsx } from "clsx";

export function WalletDetailsRow({ className, icon, label, tone, value }: { className?: string; icon: ReactNode; label: string; tone: string; value: ReactNode }) {
  return (
    <div className={clsx("grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 border-b border-stone-100 py-4 last:border-b-0", className)}>
      <span className={clsx("inline-flex size-11 shrink-0 items-center justify-center rounded-md", walletDetailsIconToneClass(tone))}>
        {icon}
      </span>
      <div className="grid gap-1 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1.2fr)] sm:items-center">
        <dt className="text-sm font-bold text-slate-600">{label}</dt>
        <dd className="min-w-0 break-all text-sm font-black text-slate-950 sm:text-right">{value}</dd>
      </div>
    </div>
  );
}

export function WalletDetailsBadge({ status }: { status: string }) {
  return <span className={clsx("inline-flex min-h-8 items-center justify-center rounded-full px-4 text-sm font-black", walletDetailsBadgeClass(status))}>{status}</span>;
}

function walletDetailsIconToneClass(tone: string) {
  if (tone === "green") return "bg-emerald-50 text-emerald-700";
  if (tone === "purple") return "bg-violet-50 text-violet-700";
  return "bg-blue-50 text-blue-700";
}

function walletDetailsBadgeClass(status: string) {
  const value = status.toLowerCase();
  if (value === "active" || value === "connected") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
  if (value === "pending" || value === "inactive") return "bg-amber-50 text-amber-800 ring-1 ring-amber-100";
  if (value === "failed" || value === "disabled") return "bg-red-50 text-red-800 ring-1 ring-red-100";
  return "bg-violet-50 text-violet-800 ring-1 ring-violet-100";
}
