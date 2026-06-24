"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import type { QuickActionPanelProps } from "./types";

const headingByLevel: Record<NonNullable<QuickActionPanelProps["headingLevel"]>, ElementType> = {
  2: "h2",
  3: "h3",
  4: "h4",
};

type QuickActionPanelDisclosureProps = {
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  collapseStorageKey?: string;
  defaultCollapsed?: boolean;
  headingLevel: NonNullable<QuickActionPanelProps["headingLevel"]>;
  persistCollapseState?: boolean;
  title?: string;
};

export function QuickActionPanelDisclosure({
  children,
  className = "",
  collapsible = false,
  collapseStorageKey = "rollfinders.quickActionsCollapsed",
  defaultCollapsed = false,
  headingLevel,
  persistCollapseState = false,
  title,
}: QuickActionPanelDisclosureProps) {
  const Heading = headingByLevel[headingLevel];
  const contentId = useId();
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);

  useEffect(() => {
    if (!collapsible || !persistCollapseState) return;
    const stored = window.sessionStorage.getItem(collapseStorageKey);
    if (stored !== "collapsed" && stored !== "expanded") return;
    queueMicrotask(() => setCollapsed(stored === "collapsed"));
  }, [collapsible, collapseStorageKey, persistCollapseState]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      if (persistCollapseState) {
        window.sessionStorage.setItem(collapseStorageKey, next ? "collapsed" : "expanded");
      }
      return next;
    });
  }

  if (!title && !children) return null;

  return (
    <section className={className} aria-labelledby={title ? "quick-action-panel-title" : undefined}>
      <div className={collapsible ? "flex items-center justify-between gap-3" : undefined}>
        {title ? <Heading id="quick-action-panel-title" className="text-xl font-black text-slate-950">{title}</Heading> : null}
        {collapsible ? (
          <button
            aria-controls={contentId}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand Quick Actions" : "Collapse Quick Actions"}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-200 bg-white px-3 text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            type="button"
            onClick={toggleCollapsed}
          >
            {collapsed ? <ChevronDown size={18} aria-hidden /> : <ChevronUp size={18} aria-hidden />}
          </button>
        ) : null}
      </div>
      {!collapsed ? <div id={contentId}>{children}</div> : null}
    </section>
  );
}
