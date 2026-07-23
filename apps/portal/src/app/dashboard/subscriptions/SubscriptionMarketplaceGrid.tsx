"use client";

import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";

import { GridDashboard, type GridDashboardItem } from "@/app/_components/GridDashboard";
import { Icon, type SidePanelIcon } from "@/app/_components/Icons";

export type SubscriptionMarketplaceGridItem = GridDashboardItem & {
  actionHref: string;
  actionLabel?: string;
  active: boolean;
  allowed: boolean;
  badge?: string;
  billingLabel: string;
  features: string[];
  icon: SidePanelIcon;
  priceLabel: string;
  unavailableLabel?: string;
  selected: boolean;
  targetLevel: number;
  targetLevelName?: string;
};

function SubscriptionPlanGridCard({ className, item }: { className: string; item: SubscriptionMarketplaceGridItem }) {
  const requiredLevel = item.targetLevelName ? `Level ${item.targetLevel} (${item.targetLevelName})` : `Level ${item.targetLevel}`;
  const unavailableLabel = item.unavailableLabel ?? `${requiredLevel} required`;
  return (
    <article className={`${className} flex h-fit flex-col rounded-lg border bg-white p-5 shadow-sm transition ${item.selected ? "border-teal-700 ring-1 ring-teal-700" : "border-stone-200 hover:border-teal-300"} ${!item.allowed ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-teal-700 shadow-sm">
            <Icon name={item.icon} size={24} />
          </span>
          <h3 className="min-w-0 pt-2 text-lg font-black leading-6 text-slate-950">{item.label}</h3>
        </div>
        {item.badge ? <span className="shrink-0 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-black text-teal-800">{item.badge}</span> : null}
      </div>
      <div className="mt-5 flex items-end gap-2">
        <p className="text-2xl font-black text-teal-700">{item.priceLabel}</p>
        <p className="pb-0.5 text-sm font-semibold text-slate-600">/ {item.billingLabel}</p>
      </div>
      <span className="mt-2 h-0.5 w-11 rounded-full bg-teal-200" aria-hidden />
      <p className="mt-4 line-clamp-3 text-sm font-medium leading-6 text-slate-600">{item.description}</p>
      <ul className="mt-5 grid gap-2.5">
        {item.features.slice(0, 4).map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm font-black text-slate-800">
              <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white">
                <CheckCircle2 size={11} aria-hidden />
              </span>
              <span className="line-clamp-1">{feature}</span>
            </li>
          ))}
        </ul>
      <div className="mt-5">
        {item.allowed ? (
          <Link href={item.actionHref} className={`flex min-h-9 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm font-black shadow-sm transition ${item.selected ? "border-teal-700 bg-teal-700 text-white hover:bg-teal-800" : "border-teal-700 bg-white text-teal-800 hover:bg-teal-50"}`}>
            {item.selected ? (
              <>
                <span className="inline-flex h-4 w-8 items-center rounded-full bg-teal-700 p-0.5">
                  <span className="ml-auto size-3 rounded-full bg-white" />
                </span>
                {item.actionLabel ?? (item.active ? "Active" : "Added")}
              </>
            ) : (
              <>
                <Plus size={16} aria-hidden />
                {item.actionLabel ?? "Add Module"}
              </>
            )}
          </Link>
        ) : (
          <span className="flex min-h-9 w-full items-center justify-center rounded-md border border-stone-200 bg-stone-50 px-4 text-sm font-black text-slate-500">{unavailableLabel}</span>
        )}
      </div>
    </article>
  );
}

export function SubscriptionMarketplaceGrid({ items }: { items: SubscriptionMarketplaceGridItem[] }) {
  return (
    <GridDashboard
      alwaysShowPagination
      emptyMessage="No subscription modules are available yet."
      getItemClassName={() => "sm:col-span-6 xl:col-span-4 2xl:col-span-3"}
      getItemKey={(item) => item.href}
      getSearchText={(item) => `${item.label} ${item.description} ${item.features.join(" ")}`}
      items={items}
      itemsPerPage={10}
      paginationLabel="plans"
      renderItem={(item, className) => <SubscriptionPlanGridCard className={className} item={item} />}
      showSearch={false}
    />
  );
}
