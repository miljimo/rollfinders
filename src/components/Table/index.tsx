"use client";

import { clsx } from "clsx";
import { TableBody } from "./TableBody";
import { TableEmptyState } from "./TableEmptyState";
import { TableHeader } from "./TableHeader";
import { TableLoadingState } from "./TableLoadingState";
import { TablePagination } from "./TablePagination";
import type { TableProps, TableRecord } from "./types";

export { TableActions } from "./TableActions";
export { TableBody } from "./TableBody";
export { TableCell } from "./TableCell";
export { TableEmptyState } from "./TableEmptyState";
export { TableHeader } from "./TableHeader";
export { TableLoadingState } from "./TableLoadingState";
export { TablePagination } from "./TablePagination";
export { TableRow } from "./TableRow";
export { TableStatusBadge } from "./TableStatusBadge";
export type { TableAction, TableColumn, TablePaginationProps, TableProps, TableRecord, TableRowId } from "./types";

export function Table<T extends TableRecord>({
  title,
  columns,
  data,
  actions = [],
  pagination,
  loading = false,
  emptyMessage,
  loadingMessage,
  getRowId,
  minWidthClassName = "min-w-[680px]",
  className,
}: TableProps<T>) {
  if (loading) {
    return (
      <section className={className}>
        {title ? <h2 className="text-2xl font-black text-stone-950">{title}</h2> : null}
        <div className={title ? "mt-4" : undefined}>
          <TableLoadingState message={loadingMessage} />
        </div>
      </section>
    );
  }

  if (data.length === 0) {
    return (
      <section className={className}>
        {title ? <h2 className="text-2xl font-black text-stone-950">{title}</h2> : null}
        <div className={title ? "mt-4" : undefined}>
          <TableEmptyState message={emptyMessage} />
        </div>
      </section>
    );
  }

  return (
    <section className={className}>
      {title ? <h2 className="text-2xl font-black text-stone-950">{title}</h2> : null}
      <div className={clsx("overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm", title && "mt-4")}>
        <div className="overflow-x-auto">
          <table className={clsx("w-full border-collapse text-left text-sm", minWidthClassName)}>
            <TableHeader columns={columns} hasActions={actions.length > 0} />
            <TableBody columns={columns} data={data} actions={actions} getRowId={getRowId} />
          </table>
        </div>
        {pagination ? <TablePagination {...pagination} /> : null}
      </div>
    </section>
  );
}
