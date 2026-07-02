"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { GridItemDashboard, type GridDashboardItem } from "./GridItemDashboard";

export function GridDashboard({ items }: { items: GridDashboardItem[] }) {
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
            placeholder="Search app services..."
            className="min-h-16 w-full rounded-lg border border-stone-200 bg-white pl-14 pr-5 text-lg font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-5 xl:gap-6">
        {filteredItems.map((item) => (
          <GridItemDashboard
            key={item.href}
            item={item}
          />
        ))}
        {!filteredItems.length ? (
          <p className="rounded-lg border border-stone-200 bg-white p-7 text-lg font-semibold text-slate-600">
            No apps found.
          </p>
        ) : null}
      </div>
    </section>
  );
}
