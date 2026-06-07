import { TableActions } from "./TableActions";
import type { TableAction, TableColumn, TableRecord } from "./types";

function renderCellValue<T extends TableRecord>(column: TableColumn<T>, row: T, rowIndex: number) {
  const value = row[column.key];
  return column.render ? column.render(value, row, rowIndex) : value == null ? null : String(value);
}

export function TableMobileCards<T extends TableRecord>({
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
    <div className="divide-y divide-stone-100 md:hidden">
      {data.map((row, rowIndex) => {
        const rowKey = getRowId ? getRowId(row, rowIndex) : rowIndex;
        const primaryColumn = columns[0];
        const detailColumns = columns.slice(1);

        return (
          <article key={rowKey} className="p-4">
            {primaryColumn ? (
              <div>
                <p className="text-xs font-black uppercase text-stone-500">{primaryColumn.title}</p>
                <div className="mt-2 break-words text-base font-black text-slate-950">
                  {renderCellValue(primaryColumn, row, rowIndex)}
                </div>
              </div>
            ) : null}

            {detailColumns.length > 0 ? (
              <dl className="mt-4 grid gap-3 text-sm">
                {detailColumns.map((column) => (
                  <div key={String(column.key)} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3">
                    <dt className="text-xs font-black uppercase text-stone-500">{column.title}</dt>
                    <dd className="min-w-0 break-words font-semibold text-slate-800">
                      {renderCellValue(column, row, rowIndex)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {actions.length > 0 ? (
              <div className="mt-4 border-t border-stone-100 pt-4">
                <TableActions actions={actions} row={row} />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
