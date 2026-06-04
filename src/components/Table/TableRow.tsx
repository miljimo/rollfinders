import type { ReactNode } from "react";

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="border-t border-stone-100">{children}</tr>;
}
