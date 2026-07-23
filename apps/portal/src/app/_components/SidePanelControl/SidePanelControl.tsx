"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { PanelContent } from "./PanelContent";
import type { SidePanelItem } from "./types";

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
const railWidth = "4rem";

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

      <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-stone-200 bg-white shadow-sm motion-safe:transition-[width] motion-safe:duration-200 lg:flex lg:flex-col ${collapsed ? "w-16" : "w-64"}`}>
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
