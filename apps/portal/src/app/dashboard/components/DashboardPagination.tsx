import { Pagination as SharedPagination } from "@/components/pagination";

export function DashboardPagination({
  currentPage,
  getPageHref,
  itemsPerPage,
  pageKey,
  totalItems,
}: {
  currentPage: number;
  getPageHref: (page: number) => string;
  itemsPerPage: number;
  pageKey: string;
  totalItems: number;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-stone-600">
        Showing {start}-{end} of {totalItems}
      </p>
      <SharedPagination
        ariaLabel={`${pageKey} pagination`}
        className="m-0"
        currentPage={currentPage}
        totalPages={totalPages}
        getPageHref={getPageHref}
        showPageNumbers={false}
        showSummary
      />
    </div>
  );
}
