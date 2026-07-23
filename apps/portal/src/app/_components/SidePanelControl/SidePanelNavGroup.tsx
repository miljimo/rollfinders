import Link from "next/link";
import { Icon } from "@/app/_components/Icons";
import { SidePanelNavItem } from "./SidePanelNavItem";
import type { SidePanelItem } from "./types";

export function SidePanelNavGroup({ collapsed, item, onNavigate }: { collapsed: boolean; item: SidePanelItem; onNavigate?: () => void }) {
  const expanded = Boolean(item.children?.length && item.active && !collapsed);

  return (
    <div className="grid gap-2">
      <SidePanelNavItem item={item} collapsed={collapsed} onNavigate={onNavigate} showExpandedIndicator={expanded} />
      {expanded ? (
        <div className="grid gap-2 pl-3 pr-2" aria-label={`${item.label} sections`}>
          {item.children?.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              aria-current={child.active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 ${child.active ? "bg-blue-50 text-blue-700 font-bold" : "font-medium text-slate-700 hover:bg-stone-50 hover:text-stone-950"}`}
              onClick={onNavigate}
            >
              {child.icon ? <Icon name={child.icon} /> : null}
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
