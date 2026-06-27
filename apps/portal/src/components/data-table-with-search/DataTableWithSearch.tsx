import type { ReactNode } from "react";
import { SearchForm } from "@/components/SearchForm";
import { Table, type TableAction, type TableColumn, type TablePaginationProps, type TableRecord, type TableRowId } from "@/components/Table";

export type DataTableSearchConfig = {
  action: string;
  name?: string;
  value?: string;
  placeholder: string;
  submitLabel?: string;
  hiddenFields?: Record<string, string | number | boolean | null | undefined>;
};

export type DataTableWithSearchProps<T extends TableRecord> = {
  title?: ReactNode;
  description?: ReactNode;
  columns: TableColumn<T>[];
  data: T[];
  actions?: TableAction<T>[];
  emptyMessage?: ReactNode;
  filters?: ReactNode;
  getRowHref?: (row: T, rowIndex: number) => string | undefined;
  getRowId?: (row: T, rowIndex: number) => TableRowId;
  headerActions?: ReactNode;
  loading?: boolean;
  loadingMessage?: ReactNode;
  minWidthClassName?: string;
  pagination?: TablePaginationProps;
  search?: DataTableSearchConfig;
};

export function DataTableWithSearch<T extends TableRecord>({
  title,
  description,
  columns,
  data,
  actions,
  emptyMessage,
  filters,
  getRowHref,
  getRowId,
  headerActions,
  loading,
  loadingMessage,
  minWidthClassName,
  pagination,
  search,
}: DataTableWithSearchProps<T>) {
  return (
    <section className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {(title || description || headerActions) ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          {(title || description) ? (
            <div>
              {title ? <h2 className="text-xl font-black text-slate-950">{title}</h2> : null}
              {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
            </div>
          ) : null}
          {headerActions ? <div className="flex flex-wrap items-center gap-2">{headerActions}</div> : null}
        </div>
      ) : null}

      {(search || filters) ? (
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          {search ? (
            <SearchForm
              action={search.action}
              className="min-w-0 flex-1"
              hiddenFields={search.hiddenFields}
              inputName={search.name}
              placeholder={search.placeholder}
              query={search.value}
              submitLabel={search.submitLabel}
            />
          ) : null}
          {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
        </div>
      ) : null}

      <Table
        actions={actions}
        className={(title || description || headerActions || search || filters) ? "mt-4" : undefined}
        columns={columns}
        data={data}
        emptyMessage={emptyMessage}
        getRowHref={getRowHref}
        getRowId={getRowId}
        loading={loading}
        loadingMessage={loadingMessage}
        minWidthClassName={minWidthClassName}
        pagination={pagination}
      />
    </section>
  );
}
