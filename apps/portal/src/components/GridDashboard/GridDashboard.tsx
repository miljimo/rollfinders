"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { useMemo, useState } from "react";

import { GridItemDashboard, type GridDashboardItem } from "./GridItemDashboard";

const GRID_CARD_LAYOUT_CLASSES = {
  compact: "sm:col-span-6 xl:col-span-4",
  medium: "sm:col-span-6 lg:col-span-4",
  wide: "sm:col-span-12 lg:col-span-6",
  full: "sm:col-span-12",
} as const;

type GridCardLayout = keyof typeof GRID_CARD_LAYOUT_CLASSES;

function getGridCardLayout(item: GridDashboardItem): GridCardLayout {
  const labelLength = item.label.trim().length;
  const descriptionLength = item.description.trim().length;

  if (labelLength >= 28 || descriptionLength >= 130) return "full";
  if (labelLength >= 18 || descriptionLength >= 86) return "wide";
  if (labelLength >= 12 || descriptionLength >= 54) return "medium";

  return "compact";
}

type GridDashboardProps<TItem extends GridDashboardItem = GridDashboardItem> = {
  alwaysShowPagination?: boolean;
  emptyMessage?: string;
  getItemClassName?: (item: TItem) => string;
  getItemKey?: (item: TItem) => string;
  getSearchText?: (item: TItem) => string;
  items: TItem[];
  itemsPerPage?: number;
  paginationLabel?: string;
  renderItem?: (item: TItem, className: string) => ReactNode;
  searchLabel?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
};

export function GridDashboard<TItem extends GridDashboardItem = GridDashboardItem>({
  alwaysShowPagination = false,
  emptyMessage = "No apps found.",
  getItemClassName,
  getItemKey,
  getSearchText,
  items,
  itemsPerPage = 12,
  paginationLabel = "services",
  renderItem,
  searchLabel = "Search apps",
  searchPlaceholder = "Search app services...",
  showSearch = true,
}: GridDashboardProps<TItem>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => (getSearchText ? getSearchText(item) : `${item.label} ${item.description}`).toLowerCase().includes(query));
  }, [getSearchText, items, search]);
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
    <section className="mt-7 lg:mt-8">
      {showSearch ? <div className="mb-5 flex justify-end lg:mb-6">
        <label className="relative block w-full sm:max-w-[28rem]">
          <span className="sr-only">{searchLabel}</span>
          <Search size={22} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-h-12 w-full rounded-lg border border-stone-200 bg-white pl-12 pr-4 text-base font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 sm:min-h-14"
          />
        </label>
      </div> : null}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-flow-dense sm:grid-cols-12 lg:gap-5">
        {visibleItems.map((item) => {
          const className = getItemClassName ? getItemClassName(item) : GRID_CARD_LAYOUT_CLASSES[getGridCardLayout(item)];
          const key = getItemKey ? getItemKey(item) : item.href;
          return renderItem ? (
            <Fragment key={key}>{renderItem(item, className)}</Fragment>
          ) : (
            <GridItemDashboard
              key={key}
              item={item}
              className={className}
            />
          );
        })}
        {!filteredItems.length ? (
          <p className="rounded-lg border border-stone-200 bg-white p-7 text-lg font-semibold text-slate-600">
            {emptyMessage}
          </p>
        ) : null}
      </div>
      {alwaysShowPagination || filteredItems.length > pageSize ? (
        <nav className="mt-7 flex flex-col gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label="App dashboard pagination">
          <p className="text-sm font-semibold text-slate-600">
            Showing {startItem}-{endItem} of {filteredItems.length} {paginationLabel}
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
