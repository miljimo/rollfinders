import { PaginationControl } from "./PaginationControl";
import type { TablePaginationProps } from "./types";

export function TablePagination({
  page,
  totalPages,
  onPrevious,
  onNext,
  previousHref,
  nextHref,
  previousLabel = "Previous",
  nextLabel = "Next",
}: TablePaginationProps) {
  const currentPage = Math.max(1, page);
  const pageCount = Math.max(1, totalPages);
  const previousDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= pageCount;

  return (
    <nav className="flex flex-col gap-3 border-t border-stone-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Table pagination">
      <p className="text-sm font-semibold text-stone-600">
        Page {currentPage} of {pageCount}
      </p>
      <div className="flex flex-wrap gap-2">
        <PaginationControl disabled={previousDisabled} href={previousHref} onClick={onPrevious} ariaLabel="Go to previous page">
          {previousLabel}
        </PaginationControl>
        <PaginationControl disabled={nextDisabled} href={nextHref} onClick={onNext} ariaLabel="Go to next page">
          {nextLabel}
        </PaginationControl>
      </div>
    </nav>
  );
}
