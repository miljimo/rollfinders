import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";

import { Icon, type SidePanelIcon } from "@/components/Icons";

export type GridDashboardItem = {
  description: string;
  href: string;
  icon: SidePanelIcon;
  label: string;
};

export type GridItemDashboardProps = {
  className?: string;
  item: GridDashboardItem;
};

export function GridItemDashboard({ className, item }: GridItemDashboardProps) {
  return (
    <Link
      href={item.href}
      className={clsx(
        "group grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 sm:gap-5 sm:p-5 lg:p-6",
        className,
      )}
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-800 ring-1 ring-teal-100 transition group-hover:bg-teal-100 sm:size-16">
        <Icon name={item.icon} size={28} className="shrink-0 sm:size-8" />
      </span>
      <span className="block min-w-0 max-w-full">
        <span className="block max-w-full text-lg font-black leading-6 text-slate-950 [overflow-wrap:anywhere] sm:text-xl sm:leading-7">{item.label}</span>
        <span className="mt-2 block max-w-full text-sm font-medium leading-6 text-slate-600 [overflow-wrap:anywhere] sm:text-base">{item.description}</span>
      </span>
      <ChevronRight size={24} className="shrink-0 text-teal-700 transition group-hover:translate-x-1" aria-hidden />
    </Link>
  );
}
