import { clsx } from "clsx";
import type { TableColumn, TableRecord } from "./types";

type TableHeaderProps<T extends  TableRecord> =  { 
  columns: TableColumn<T>[];
   hasActions: boolean 
}

export function TableHeader<T extends TableRecord>({ columns, hasActions }: TableHeaderProps<T>
  ) {
  return (
    <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500">
      <tr>
        {columns.map((column) => (
          <th key={String(column.key)} scope="col" className={clsx("px-4 py-3", column.headerClassName)}>
            {column.title}
          </th>
        ))}
        {hasActions ? (
          <th scope="col" 
             className="px-4 py-3 text-right">
            Actions
          </th>
        ) : null}
      </tr>
    </thead>
  );
}
