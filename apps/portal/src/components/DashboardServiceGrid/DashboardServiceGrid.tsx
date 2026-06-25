"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Icon, type SidePanelIcon } from "@/components/Icons";

export type DashboardServiceGridItem = {
  description: string;
  href: string;
  icon: SidePanelIcon;
  label: string;
};

const cardSizeClasses = [
  "md:col-span-6 xl:col-span-3",
  "md:col-span-6 xl:col-span-3",
  "md:col-span-6 xl:col-span-3",
  "md:col-span-6 xl:col-span-3",
  "md:col-span-6 xl:col-span-3",
  "md:col-span-6 xl:col-span-3",
  "md:col-span-6 xl:col-span-3",
  "md:col-span-6 xl:col-span-3",
  "md:col-span-6 xl:col-span-4",
  "md:col-span-6 xl:col-span-4",
  "md:col-span-6 xl:col-span-4",
];

export function DashboardServiceGrid({ items }: { items: DashboardServiceGridItem[] }) {
  const [search, setSearch] = useState("");
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query));
  }, [items, search]);

  return (
    <section className="mt-10">
      <div className="mb-7 flex justify-end">
        <label className="relative block w-full sm:max-w-[28rem]">
          <span className="sr-only">Search apps</span>
          <Search size={24} aria-hidden className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search apps..."
            className="min-h-16 w-full rounded-lg border border-stone-200 bg-white pl-14 pr-5 text-lg font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12 xl:gap-6">
        {filteredItems.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "group relative flex min-h-52 items-center gap-6 rounded-lg border border-stone-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2",
              cardSizeClasses[index % cardSizeClasses.length],
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
        ))}
        {!filteredItems.length ? (
          <p className="rounded-lg border border-stone-200 bg-white p-7 text-lg font-semibold text-slate-600 md:col-span-12">
            No apps found.
          </p>
        ) : null}
      </div>
    </section>
  );
}
