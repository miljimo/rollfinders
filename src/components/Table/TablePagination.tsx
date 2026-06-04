import Link from "next/link";
import { clsx } from "clsx";
import type { TablePaginationProps } from "./types";

function PaginationControl({
  children,
  disabled,
  href,
  onClick,
  ariaLabel,
}: {
  children: string;
  disabled: boolean;
  href?: string;
  onClick?: () => void;
  ariaLabel: string;
}) {
  const className = clsx(
    "inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2",
    disabled ? "pointer-events-none text-stone-400 opacity-60" : "text-stone-800 hover:border-teal-700 hover:text-teal-800",
  );

  if (href && !disabled) {
    return (
      <Link href={href} aria-label={ariaLabel} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={ariaLabel} className={className} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

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
