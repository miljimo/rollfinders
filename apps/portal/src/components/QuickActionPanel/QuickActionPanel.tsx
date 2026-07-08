import type { ElementType } from "react";
import { ActionItem } from "./ActionItem";
import { QuickActionPanelDisclosure } from "./QuickActionPanelDisclosure";
import type { QuickActionPanelProps } from "./types";

const headingByLevel: Record<NonNullable<QuickActionPanelProps["headingLevel"]>, ElementType> = {
  2: "h2",
  3: "h3",
  4: "h4",
};

export function QuickActionPanel({
  title = "Quick Actions",
  items,
  maxItems,
  headingLevel = 2,
  collapsible = false,
  defaultCollapsed = false,
  persistCollapseState = false,
  collapseStorageKey,
  emptyBehavior = "hide",
  emptyMessage = "No quick actions available.",
  emptyState = null,
  className = "",
}: QuickActionPanelProps) {
  const visibleItems = typeof maxItems === "number" ? items.slice(0, Math.max(0, maxItems)) : items;
  const resolvedEmptyState = emptyState ?? (emptyBehavior === "message" ? emptyMessage : null);

  if (visibleItems.length === 0 && !resolvedEmptyState) return null;

  const Heading = headingByLevel[headingLevel];
  const content = visibleItems.length > 0 ? (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visibleItems.map((item) => (
        <ActionItem key={item.id} item={item} />
      ))}
    </div>
  ) : (
    <div className="mt-4 max-w-md rounded-lg border border-stone-200 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm">{resolvedEmptyState}</div>
  );

  if (collapsible) {
    return (
      <QuickActionPanelDisclosure
        className={className}
        collapsible
        collapseStorageKey={collapseStorageKey}
        defaultCollapsed={defaultCollapsed}
        headingLevel={headingLevel}
        persistCollapseState={persistCollapseState}
        title={title}
      >
        {content}
      </QuickActionPanelDisclosure>
    );
  }

  return (
    <section className={className} aria-labelledby="quick-action-panel-title">
      {title ? <Heading id="quick-action-panel-title" className="text-xl font-black text-slate-950">{title}</Heading> : null}
      {content}
    </section>
  );
}
