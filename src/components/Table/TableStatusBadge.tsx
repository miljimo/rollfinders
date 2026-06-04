import { clsx } from "clsx";

const statusStyles: Record<string, string> = {
  active: "border-teal-200 bg-teal-50 text-teal-900",
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  disabled: "border-stone-200 bg-stone-100 text-stone-700",
  archived: "border-red-200 bg-red-50 text-red-900",
};

export function TableStatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();

  return (
    <span
      className={clsx(
        "inline-flex rounded-md border px-2 py-1 text-xs font-bold capitalize",
        statusStyles[normalizedStatus] ?? "border-stone-200 bg-white text-stone-700",
      )}
    >
      {status}
    </span>
  );
}
