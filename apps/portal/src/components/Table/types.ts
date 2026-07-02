import type { ReactNode } from "react";

export type TableRowId = string | number;

export type TableRecord = Record<string, unknown>;

export interface TableColumn<T extends TableRecord> {
  key: keyof T | string;
  title: ReactNode;
  className?: string;
  headerClassName?: string;
  render?: (value: unknown, row: T, rowIndex: number) => ReactNode;
}

export interface TableAction<T extends TableRecord> {
  label: string;
  ariaLabel?: string | ((row: T) => string);
  href?: string | ((row: T) => string);
  onClick?: (row: T) => void;
  disabled?: boolean | ((row: T) => boolean);
}

export interface TablePaginationProps {
  page: number;
  totalPages: number;
  onPrevious?: () => void;
  onNext?: () => void;
  previousHref?: string;
  nextHref?: string;
  previousLabel?: string;
  nextLabel?: string;
}

export interface TableProps<T extends TableRecord> {
  title?: ReactNode;
  columns: TableColumn<T>[];
  data: T[];
  actions?: TableAction<T>[];
  pagination?: TablePaginationProps;
  loading?: boolean;
  emptyMessage?: ReactNode;
  loadingMessage?: ReactNode;
  getRowId?: (row: T, rowIndex: number) => TableRowId;
  getRowHref?: (row: T, rowIndex: number) => string | undefined;
  getRowDoubleClickHref?: (row: T, rowIndex: number) => string | undefined;
  minWidthClassName?: string;
  className?: string;
}
