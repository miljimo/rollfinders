import type { ReactNode } from "react";

import { CopyButton } from "@/components/copy-button";

export function TransactionDetailSection({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-4 text-xl font-black text-slate-950">
        <span className="text-slate-600">{icon}</span>
        {title}
      </h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function TransactionDetailRow({ copyable = false, label, value }: { copyable?: boolean; label: string; value: ReactNode }) {
  return (
    <div className="grid min-h-12 items-center gap-3 border-b border-stone-100 py-3 last:border-b-0 md:grid-cols-[13rem_minmax(0,1fr)_2rem]">
      <span className="text-sm font-black text-slate-500">{label}</span>
      <span className="break-all text-sm font-black text-slate-950">{value}</span>
      {copyable ? (
        <CopyButton label={`Copy ${label}`} value={String(value)} variant="subtle" className="size-8 text-slate-500" />
      ) : <span aria-hidden />}
    </div>
  );
}

export function TransactionWalletCard({ icon, label, tone, value }: { icon: ReactNode; label: string; tone: "blue" | "green"; value: string }) {
  const toneClassName = tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700";

  return (
    <div className="mt-4 flex items-center gap-5 rounded-lg border border-stone-200 px-5 py-5">
      <span className={`flex size-16 shrink-0 items-center justify-center rounded-full ${toneClassName}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-black text-slate-700">{label}</p>
        <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-950">{value}</p>
      </div>
      {value !== "None" ? (
        <CopyButton label={`Copy ${label}`} value={value} className="size-11 shrink-0 border-stone-200 text-slate-500" />
      ) : null}
    </div>
  );
}
