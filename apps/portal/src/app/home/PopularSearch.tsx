import Link from "next/link";
import type { ReactNode } from "react";

export function PopularSearch({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link href={href} className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
      {children}
    </Link>
  );
}
