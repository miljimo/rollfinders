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
        "group relative flex min-h-52 items-center gap-6 rounded-lg border border-stone-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="grid size-20 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-800 ring-1 ring-teal-100 transition group-hover:bg-teal-100">
        <Icon name={item.icon} size={34} className="shrink-0" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-black text-slate-950">{item.label}</span>
        <span className="mt-3 block max-w-72 text-lg font-medium leading-8 text-slate-600">{item.description}</span>
      </span>
      <ChevronRight size={28} className="absolute bottom-10 right-8 text-teal-700 transition group-hover:translate-x-1" aria-hidden />
    </Link>
  );
}
