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
        "group grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 overflow-hidden rounded-lg border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 sm:gap-6 sm:p-7",
        className,
      )}
    >
      <span className="grid size-20 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-800 ring-1 ring-teal-100 transition group-hover:bg-teal-100">
        <Icon name={item.icon} size={34} className="shrink-0" />
      </span>
      <span className="block min-w-0 max-w-full overflow-hidden">
        <span className="block max-w-full truncate whitespace-nowrap text-xl font-black leading-tight text-slate-950 sm:text-2xl">{item.label}</span>
        <span className="mt-3 block max-w-full text-base font-medium leading-7 text-slate-600 [overflow-wrap:anywhere] sm:text-lg sm:leading-8">{item.description}</span>
      </span>
      <ChevronRight size={28} className="shrink-0 text-teal-700 transition group-hover:translate-x-1" aria-hidden />
    </Link>
  );
}
