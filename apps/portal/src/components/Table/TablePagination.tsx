import { Pagination } from "@/components/pagination";
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

  return (
    <div className="border-t border-stone-100 px-4 py-3">
      <Pagination
        ariaLabel="Table pagination"
        className="m-0 justify-between"
        currentPage={currentPage}
        nextHref={nextHref}
        nextLabel={nextLabel}
        onNext={onNext}
        onPrevious={onPrevious}
        previousHref={previousHref}
        previousLabel={previousLabel}
        showPageNumbers={false}
        showSummary
        totalPages={pageCount}
      />
    </div>
  );
}
