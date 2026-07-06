"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex min-h-14 items-center px-4 text-base font-semibold text-slate-950 transition-colors hover:text-teal-700",
        active ? "text-teal-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-teal-700" : "text-slate-950",
      )}
    >
      {children}
    </Link>
  );
}
