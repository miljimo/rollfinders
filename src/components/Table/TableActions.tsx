"use client";

import Link from "next/link";
import { clsx } from "clsx";
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
        const className = clsx(
          "inline-flex min-h-9 items-center justify-center rounded-md border border-stone-300 px-3 text-sm font-bold text-stone-800 transition focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2",
          disabled ? "pointer-events-none opacity-50" : "hover:border-teal-700 hover:text-teal-800",
        );

        if (action.href && !disabled) {
          return (
            <Link key={action.label} href={actionValue(action.href, row)} aria-label={ariaLabel} className={className}>
              {action.label}
            </Link>
          );
        }

        return (
          <button
            key={action.label}
            type="button"
            aria-label={ariaLabel}
            className={className}
            disabled={disabled}
            onClick={() => action.onClick?.(row)}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
