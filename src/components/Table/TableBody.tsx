import { TableActions } from "./TableActions";
import { TableCell } from "./TableCell";
import { TableRow } from "./TableRow";
import type { TableAction, TableColumn, TableRecord } from "./types";

export function TableBody<T extends TableRecord>({
  actions = [],
  columns,
  data,
  getRowId,
}: {
  actions?: TableAction<T>[];
  columns: TableColumn<T>[];
  data: T[];
  getRowId?: (row: T, rowIndex: number) => string | number;
}) {
  return (
    <tbody>
      {data.map((row, rowIndex) => (
        <TableRow key={getRowId ? getRowId(row, rowIndex) : rowIndex}>
          {columns.map((column) => {
            const value = row[column.key];

            return (
              <TableCell key={String(column.key)} className={column.className}>
                {column.render ? column.render(value, row, rowIndex) : value == null ? null : String(value)}
              </TableCell>
            );
          })}
          {actions.length > 0 ? (
            <TableCell className="text-right">
              <TableActions actions={actions} row={row} />
            </TableCell>
          ) : null}
        </TableRow>
      ))}
    </tbody>
  );
}
