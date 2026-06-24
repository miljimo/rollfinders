import type { ReactNode } from "react";
import { clsx } from "clsx";

export function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx("px-4 py-3 align-middle text-stone-700", className)}>{children}</td>;
}
