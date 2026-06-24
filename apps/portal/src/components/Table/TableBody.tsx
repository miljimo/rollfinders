import { TableActions } from "./TableActions";
import { TableCell } from "./TableCell";
import { TableRow } from "./TableRow";
import type { TableAction, TableColumn, TableRecord } from "./types";

export function TableBody<T extends TableRecord>({
  actions = [],
  columns,
  data,
  getRowHref,
  getRowId,
}: {
  actions?: TableAction<T>[];
  columns: TableColumn<T>[];
  data: T[];
  getRowHref?: (row: T, rowIndex: number) => string | undefined;
  getRowId?: (row: T, rowIndex: number) => string | number;
}) {
  return (
    <tbody>
      {data.map((row, rowIndex) => {
        const rowHref = getRowHref?.(row, rowIndex);

        return (
          <TableRow key={getRowId ? getRowId(row, rowIndex) : rowIndex} href={rowHref}>
            {columns.map((column) => {
              const value = row[column.key];
              const content = column.render ? column.render(value, row, rowIndex) : value == null ? null : String(value);

              return (
                <TableCell key={String(column.key)} className={column.className}>
                  {content}
                </TableCell>
              );
            })}
            {actions.length > 0 ? (
              <TableCell className="text-right">
                <TableActions actions={actions} row={row} />
              </TableCell>
            ) : null}
          </TableRow>
        );
      })}
    </tbody>
  );
}
