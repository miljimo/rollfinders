import { Button } from "@/components/Button";
import type { TableAction, TableRecord } from "./types";

function actionValue<T extends TableRecord, V>(value: V | ((row: T) => V), row: T) {
  return typeof value === "function" ? (value as (row: T) => V)(row) : value;
}

export function TableActions<T extends TableRecord>({ actions, row }: { actions: TableAction<T>[]; row: T }) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {actions.map((action) => {
        const disabled = action.disabled ? actionValue(action.disabled, row) : false;
        const ariaLabel = action.ariaLabel ? actionValue(action.ariaLabel, row) : action.label;
        if (action.href) {
          return (
            <Button key={action.label} href={actionValue(action.href, row)} aria-label={ariaLabel} disabled={disabled} size="sm" variant="secondary" className="px-3 text-sm hover:border-teal-700 hover:text-teal-800">
              {action.label}
            </Button>
          );
        }

        return (
          <Button
            key={action.label}
            type="button"
            aria-label={ariaLabel}
            disabled={disabled}
            size="sm"
            variant="secondary"
            className="px-3 text-sm hover:border-teal-700 hover:text-teal-800"
            onClick={() => action.onClick?.(row)}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
