import Link from "next/link";
import { ChevronUp } from "lucide-react";
import { Icon } from "@/app/_components/Icons";
import type { SidePanelItem } from "./types";

export function SidePanelNavItem({
  collapsed,
  item,
  onNavigate,
  showExpandedIndicator = false,
}: {
  collapsed: boolean;
  item: SidePanelItem;
  onNavigate?: () => void;
  showExpandedIndicator?: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={`group relative flex items-center rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 ${collapsed ? "min-h-10 justify-center px-0" : "min-h-12 gap-3 px-3"} ${item.active ? collapsed ? "bg-teal-50 text-teal-800" : "bg-teal-50 text-teal-800 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-teal-700" : "hover:bg-stone-50"}`}
      onClick={onNavigate}
    >
      <Icon name={item.icon} />
      <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
      {showExpandedIndicator ? <ChevronUp size={16} aria-hidden className="ml-auto shrink-0" /> : null}
      {collapsed ? (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-bold text-white shadow-lg group-focus-visible:block group-hover:block">
          {item.label}
        </span>
      ) : null}
    </Link>
  );
}
