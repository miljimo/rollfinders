"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { GridItemDashboard, type GridDashboardItem } from "./GridItemDashboard";

export function GridDashboard({ items, itemsPerPage = 12 }: { items: GridDashboardItem[]; itemsPerPage?: number }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query));
  }, [items, search]);
  const pageSize = Math.max(1, itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleItems = filteredItems.slice(pageStart, pageStart + pageSize);
  const startItem = filteredItems.length ? pageStart + 1 : 0;
  const endItem = Math.min(pageStart + pageSize, filteredItems.length);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <section className="mt-10">
      <div className="mb-7 flex justify-end">
        <label className="relative block w-full sm:max-w-[28rem]">
          <span className="sr-only">Search apps</span>
          <Search size={24} aria-hidden className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search app services..."
            className="min-h-16 w-full rounded-lg border border-stone-200 bg-white pl-14 pr-5 text-lg font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),22rem))] justify-start gap-5 xl:gap-6">
        {visibleItems.map((item) => (
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
      {filteredItems.length > pageSize ? (
        <nav className="mt-7 flex flex-col gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label="App dashboard pagination">
          <p className="text-sm font-semibold text-slate-600">
            Showing {startItem}-{endItem} of {filteredItems.length} services
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-teal-700 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Go to previous app dashboard page"
            >
              <ChevronLeft size={16} aria-hidden />
              Previous
            </button>
            <span className="inline-flex min-h-10 items-center rounded-md px-2 text-sm font-black text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-teal-700 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Go to next app dashboard page"
            >
              Next
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
