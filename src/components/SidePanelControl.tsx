"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Building2, CalendarDays, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, HelpCircle, Home, LogOut, Map, Menu, Settings, Users, X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import {Icon , SidePanelIcon } from "@/components/Icons"


export type SidePanelItem = {
  href: string;
  icon: SidePanelIcon;
  label: string;
  active?: boolean;
  children?: SidePanelChildItem[];
};

export type SidePanelChildItem = {
  href: string;
  icon?: SidePanelIcon;
  label: string;
  active?: boolean;
};

type SidePanelControlProps = {
  accountLabel?: string | null;
  footerNavigationItems?: SidePanelItem[];
  mobileNavigationItems?: SidePanelItem[];
  navigationItems: SidePanelItem[];
  roleLabel?: string | null;
  supportHref?: string;
};

const collapsedStorageKey = "rollfinders.adminSidePanelCollapsed";
const expandedWidth = "16rem";
const railWidth = "4.5rem";

export function SidePanelControl({
  accountLabel,
  footerNavigationItems = [],
  mobileNavigationItems,
  navigationItems,
  roleLabel,
  supportHref = "/contact",
}: SidePanelControlProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const drawerTitleId = useId();
  const drawerId = useId();
  const mobileOpenButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const savedCollapsed = sessionStorage.getItem(collapsedStorageKey) === "true";
    const frame = window.requestAnimationFrame(() => setCollapsed(savedCollapsed));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    sessionStorage.setItem(collapsedStorageKey, String(collapsed));
    document.documentElement.style.setProperty("--admin-sidebar-width", expandedWidth);
    document.documentElement.style.setProperty("--admin-sidebar-rail-width", railWidth);
    document.documentElement.style.setProperty("--admin-side-panel-width", collapsed ? railWidth : expandedWidth);
    return () => {
      document.documentElement.style.removeProperty("--admin-sidebar-width");
      document.documentElement.style.removeProperty("--admin-sidebar-rail-width");
      document.documentElement.style.removeProperty("--admin-side-panel-width");
    };
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const openButton = mobileOpenButtonRef.current;
    document.body.style.overflow = "hidden";
    const focusableSelector = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    window.requestAnimationFrame(() => {
      focusable[0]?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const drawerFocusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      if (!drawerFocusable.length) return;
      const first = drawerFocusable[0];
      const last = drawerFocusable[drawerFocusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      openButton?.focus();
    };
  }, [mobileOpen]);

  return (
    <>
      <button
        type="button"
        ref={mobileOpenButtonRef}
        className="fixed left-4 top-4 z-30 inline-flex size-11 items-center justify-center rounded-md border border-stone-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 lg:hidden"
        aria-label="Open dashboard navigation"
        aria-expanded={mobileOpen}
        aria-controls={drawerId}
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={22} aria-hidden />
      </button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Close dashboard navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            ref={drawerRef}
            id={drawerId}
            className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-stone-200 bg-white shadow-2xl motion-safe:transition-transform motion-safe:duration-200"
            aria-labelledby={drawerTitleId}
            aria-modal="true"
            role="dialog"
          >
            <PanelContent
              accountLabel={accountLabel}
              collapsed={false}
              drawerTitleId={drawerTitleId}
              footerNavigationItems={footerNavigationItems}
              navigationItems={mobileNavigationItems ?? navigationItems}
              onClose={() => setMobileOpen(false)}
              roleLabel={roleLabel}
              showClose
              supportHref={supportHref}
            />
          </aside>
        </div>
      ) : null}

      <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-stone-200 bg-white motion-safe:transition-[width] motion-safe:duration-200 lg:flex lg:flex-col ${collapsed ? "w-[4.5rem]" : "w-64"}`}>
        <PanelContent
          accountLabel={accountLabel}
          collapsed={collapsed}
          footerNavigationItems={footerNavigationItems}
          navigationItems={navigationItems}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          roleLabel={roleLabel}
          supportHref={supportHref}
        />
      </aside>
    </>
  );
}

function PanelContent({
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
      <div className={`relative flex h-20 items-center border-b border-stone-200 ${collapsed ? "justify-start px-0" : "gap-3 px-3 pr-16"}`}>
        <Link href="/" className={collapsed ? "inline-flex size-[70px] shrink-0 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2" : "flex min-w-0 flex-1 items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"} aria-label="Go to RollFinders home">
          <span className="inline-flex size-[70px] shrink-0 items-center justify-center">
            <Image src="/logo.png" alt="" width={70} height={70} className="h-[70px] w-[70px] object-contain" priority />
          </span>
          <span id={drawerTitleId} className={collapsed ? "sr-only" : "min-w-0 truncate text-xl font-black text-slate-950"}>RollFinders</span>
        </Link>
        {showClose ? (
          <button type="button" className="absolute right-4 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-md border border-stone-200 bg-white text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2" aria-label="Close dashboard navigation" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        ) : null}
        {onToggleCollapsed ? (
          <button
            type="button"
            className={`${collapsed ? "-right-4 size-10 rounded-full shadow-md" : "right-4 size-11 rounded-md shadow-sm"} absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center border border-stone-200 bg-white text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2`}
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

      <nav className={`flex flex-1 flex-col gap-2 py-6 text-sm font-bold text-slate-600 ${collapsed ? "px-3" : "px-4"}`} aria-label="Dashboard navigation">
        {navigationItems.map((item) => (
          <SidePanelNavGroup key={item.href} item={item} collapsed={collapsed} onNavigate={onClose} />
        ))}
      </nav>

      <div className={`grid gap-2 border-t border-stone-200 py-5 text-sm font-bold text-slate-600 ${collapsed ? "px-3" : "px-4"}`}>
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

function SidePanelNavGroup({ collapsed, item, onNavigate }: { collapsed: boolean; item: SidePanelItem; onNavigate?: () => void }) {
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

function SidePanelNavItem({ collapsed, item, onNavigate, showExpandedIndicator = false }: { collapsed: boolean; item: SidePanelItem; onNavigate?: () => void; showExpandedIndicator?: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={`group relative flex min-h-12 items-center rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${item.active ? "bg-teal-50 text-teal-800 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-teal-700" : "hover:bg-stone-50"}`}
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
