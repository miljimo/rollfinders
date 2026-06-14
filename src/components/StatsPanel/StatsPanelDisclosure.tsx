"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";

type StatsPanelDisclosureProps = {
  children: ReactNode;
  className?: string;
  collapseStorageKey?: string;
  defaultCollapsed?: boolean;
  persistCollapseState?: boolean;
  title?: string;
};

export function StatsPanelDisclosure({
  children,
  className = "",
  collapseStorageKey = "rollfinders.statsPanelCollapsed",
  defaultCollapsed = false,
  persistCollapseState = false,
  title = "Stats Board",
}: StatsPanelDisclosureProps) {
  const contentId = useId();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    if (!persistCollapseState) return;
    const stored = window.sessionStorage.getItem(collapseStorageKey);
    if (stored !== "collapsed" && stored !== "expanded") return;
    queueMicrotask(() => setCollapsed(stored === "collapsed"));
  }, [collapseStorageKey, persistCollapseState]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      if (persistCollapseState) {
        window.sessionStorage.setItem(collapseStorageKey, next ? "collapsed" : "expanded");
      }
      return next;
    });
  }

  return (
    <section className={className} aria-labelledby="stats-panel-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="stats-panel-title" className="text-xl font-black text-slate-950">{title}</h2>
        <button
          aria-controls={contentId}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-200 bg-white px-3 text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          type="button"
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronDown size={18} aria-hidden /> : <ChevronUp size={18} aria-hidden />}
        </button>
      </div>
      {!collapsed ? <div id={contentId}>{children}</div> : null}
    </section>
  );
}
