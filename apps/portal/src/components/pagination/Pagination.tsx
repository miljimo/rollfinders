import { Button } from "@/components/Button";

export type PaginationProps = {
  ariaLabel: string;
  className?: string;
  currentPage: number;
  getPageHref?: (page: number) => string;
  nextHref?: string;
  nextLabel?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  previousHref?: string;
  previousLabel?: string;
  showPageNumbers?: boolean;
  showSummary?: boolean;
  totalPages: number;
};

export function paginationPages(currentPage: number, totalPages: number) {
  const page = Math.max(1, currentPage);
  const pageCount = Math.max(1, totalPages);
  const start = Math.max(1, page - 2);
  const end = Math.min(pageCount, page + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function Pagination({
  ariaLabel,
  className = "mt-6",
  currentPage,
  getPageHref,
  nextHref,
  nextLabel = "Next",
  onNext,
  onPrevious,
  previousHref,
  previousLabel = "Previous",
  showPageNumbers = true,
  showSummary = false,
  totalPages,
}: PaginationProps) {
  const page = Math.max(1, currentPage);
  const pageCount = Math.max(1, totalPages);
  if (pageCount <= 1 && !showSummary) return null;

  const previousDisabled = page <= 1;
  const nextDisabled = page >= pageCount;
  const resolvedPreviousHref = previousHref ?? getPageHref?.(page - 1);
  const resolvedNextHref = nextHref ?? getPageHref?.(page + 1);

  return (
    <nav className={`${className} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end`} aria-label={ariaLabel}>
      {showSummary ? (
        <p className="text-sm font-semibold text-stone-600">
          Page {page} of {pageCount}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <PaginationButton
          ariaLabel="Go to previous page"
          disabled={previousDisabled}
          href={resolvedPreviousHref}
          onClick={onPrevious}
        >
          {previousLabel}
        </PaginationButton>
        {showPageNumbers && getPageHref ? paginationPages(page, pageCount).map((pageNumber) => (
          <Button
            key={pageNumber}
            href={getPageHref(pageNumber)}
            variant={pageNumber === page ? "primary" : "secondary"}
            size="sm"
            aria-current={pageNumber === page ? "page" : undefined}
          >
            {pageNumber}
          </Button>
        )) : null}
        <PaginationButton
          ariaLabel="Go to next page"
          disabled={nextDisabled}
          href={resolvedNextHref}
          onClick={onNext}
        >
          {nextLabel}
        </PaginationButton>
      </div>
    </nav>
  );
}

function PaginationButton({
  ariaLabel,
  children,
  disabled,
  href,
  onClick,
}: {
  ariaLabel: string;
  children: string;
  disabled: boolean;
  href?: string;
  onClick?: () => void;
}) {
  if (href && !disabled) {
    return (
      <Button href={href} aria-label={ariaLabel} disabled={disabled} size="sm" variant="secondary">
        {children}
      </Button>
    );
  }

  return (
    <Button type="button" aria-label={ariaLabel} disabled={disabled} onClick={onClick} size="sm" variant="secondary">
      {children}
    </Button>
  );
}
