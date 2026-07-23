import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, LogOut, X } from "lucide-react";
import { LogoutButton } from "@/app/_components/LogoutButton";
import { SidePanelNavGroup } from "./SidePanelNavGroup";
import { SidePanelNavItem } from "./SidePanelNavItem";
import type { SidePanelItem } from "./types";

export function PanelContent({
  accountLabel,
  collapsed,
  drawerTitleId,
  footerNavigationItems,
  navigationItems,
  onClose,
  onToggleCollapsed,
  roleLabel,
  showClose,
  supportHref,
}: {
  accountLabel?: string | null;
  collapsed: boolean;
  drawerTitleId?: string;
  footerNavigationItems: SidePanelItem[];
  navigationItems: SidePanelItem[];
  onClose?: () => void;
  onToggleCollapsed?: () => void;
  roleLabel?: string | null;
  showClose?: boolean;
  supportHref: string;
}) {
  return (
    <>
      <div className={`relative flex items-center border-b border-stone-200 ${collapsed ? "h-[88px] justify-center px-0" : "h-[88px] px-8 pr-16"}`}>
        <Link href="/dashboard" className={collapsed ? "inline-flex size-14 shrink-0 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2" : "flex min-w-0 flex-1 items-center gap-4 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"} aria-label="Go to dashboard">
          <span className={collapsed ? "inline-flex size-12 shrink-0 items-center justify-center" : "inline-flex size-14 shrink-0 items-center justify-center"}>
            <Image src="/logo.png" alt="" width={70} height={70} className={collapsed ? "size-12 object-contain" : "size-14 object-contain"} priority />
          </span>
          <span id={drawerTitleId} className={collapsed ? "sr-only" : "min-w-0"}>
            <span className="block truncate text-lg font-black uppercase leading-6 text-slate-950">RollFinders</span>
            <span className="block truncate text-sm font-semibold leading-5 text-slate-700">Find Your Next Roll</span>
          </span>
        </Link>
        {showClose ? (
          <button type="button" className="absolute right-4 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-md border border-stone-200 bg-white text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2" aria-label="Close dashboard navigation" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        ) : null}
        {onToggleCollapsed ? (
          <button
            type="button"
            className={`${collapsed ? "left-[calc(100%+0.75rem)] top-7 size-10" : "-right-[22px] top-1/2 size-11 -translate-y-1/2"} absolute z-20 inline-flex items-center justify-center rounded-md border border-stone-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2`}
            aria-label={collapsed ? "Expand dashboard navigation" : "Collapse dashboard navigation"}
            onClick={onToggleCollapsed}
          >
            {collapsed ? <ChevronRight size={22} aria-hidden /> : <ChevronLeft size={20} aria-hidden />}
          </button>
        ) : null}
      </div>

      {accountLabel || roleLabel ? (
        <div className={`border-b border-stone-100 px-4 py-4 ${collapsed ? "sr-only" : ""}`}>
          {accountLabel ? <p className="truncate text-sm font-black text-slate-950">{accountLabel}</p> : null}
          {roleLabel ? <p className="mt-1 truncate text-xs font-bold uppercase tracking-wide text-slate-500">{roleLabel}</p> : null}
        </div>
      ) : null}

      <nav className={`flex flex-1 flex-col text-sm font-bold text-slate-600 ${collapsed ? "gap-3 px-2 py-3" : "gap-2 px-4 py-6"}`} aria-label="Dashboard navigation">
        {navigationItems.map((item) => (
          <SidePanelNavGroup key={item.href} item={item} collapsed={collapsed} onNavigate={onClose} />
        ))}
      </nav>

      <div className={`grid border-t border-stone-200 py-5 text-sm font-bold text-slate-600 ${collapsed ? "gap-3 px-2" : "gap-2 px-4"}`}>
        {footerNavigationItems.map((item) => (
          <SidePanelNavItem key={item.href} item={item} collapsed={collapsed} onNavigate={onClose} />
        ))}
        <SidePanelNavItem item={{ href: supportHref, icon: "help", label: "Help & Support" }} collapsed={collapsed} onNavigate={onClose} />
        <div className={`group relative flex min-h-12 items-center rounded-md ${collapsed ? "justify-center px-0" : "gap-3"}`}>
          {collapsed ? (
            <>
              <LogoutButton ariaLabel="Logout" className="inline-flex size-12 items-center justify-center rounded-md text-slate-600 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
                <LogOut size={20} aria-hidden className="shrink-0" />
              </LogoutButton>
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-bold text-white shadow-lg group-focus-within:block group-hover:block">Logout</span>
            </>
          ) : (
            <>
              <LogOut size={20} aria-hidden className="ml-3 shrink-0" />
              <LogoutButton />
            </>
          )}
        </div>
      </div>
    </>
  );
}
