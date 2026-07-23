import type { PaginationProps as SharedPaginationProps } from "@miljimo/react-components";

import { PaginationClient } from "./PaginationClient";

export type PaginationProps = SharedPaginationProps;

export function paginationPages(currentPage: number, totalPages: number) {
  const page = Math.max(1, currentPage);
  const pageCount = Math.max(1, totalPages);
  const start = Math.max(1, page - 2);
  const end = Math.min(pageCount, page + 2);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function Pagination({
  currentPage,
  getPageHref,
  nextHref,
  previousHref,
  showSummary,
  summaryLabel,
  totalPages,
  ...props
}: SharedPaginationProps) {
  const safeCurrentPage = Math.max(1, currentPage);
  const safeTotalPages = Math.max(1, totalPages);
  const pageHrefs = getPageHref
    ? Object.fromEntries(paginationPages(safeCurrentPage, safeTotalPages).map((page) => [page, getPageHref(page)]))
    : undefined;

  return (
    <PaginationClient
      {...props}
      currentPage={safeCurrentPage}
      nextHref={nextHref ?? getPageHref?.(safeCurrentPage + 1)}
      pageHrefs={pageHrefs}
      previousHref={previousHref ?? getPageHref?.(safeCurrentPage - 1)}
      showSummary={showSummary}
      summaryText={summaryLabel ? summaryLabel(safeCurrentPage, safeTotalPages) : undefined}
      totalPages={safeTotalPages}
    />
  );
}
