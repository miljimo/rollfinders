import type { ReactNode } from "react";

export function TableLoadingState({ message = "Loading records..." }: { message?: ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-stone-200 bg-white px-4 py-8 text-center text-sm font-semibold text-stone-600 shadow-sm"
    >
      {message}
    </div>
  );
}
