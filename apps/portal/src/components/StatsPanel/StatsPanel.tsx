import { StatItem } from "./StatItem";
import { StatsPanelDisclosure } from "./StatsPanelDisclosure";
import type { StatsPanelProps } from "./types";

export function StatsPanel({
  title,
  items,
  maxItems,
  collapsible = false,
  defaultCollapsed = false,
  persistCollapseState = false,
  collapseStorageKey,
  emptyBehavior = "hide",
  emptyMessage = "No stats available.",
  className = "",
}: StatsPanelProps) {
  const visibleItems = typeof maxItems === "number" ? items.slice(0, Math.max(0, maxItems)) : items;

  if (visibleItems.length === 0 && emptyBehavior === "hide") return null;
  const content = visibleItems.length > 0 ? (
    <div className={title || collapsible ? "mt-4 flex flex-wrap gap-4" : "flex flex-wrap gap-4"}>
      {visibleItems.map((item) => (
        <StatItem key={item.id} item={item} />
      ))}
    </div>
  ) : (
    <p className={title || collapsible ? "mt-4 max-w-md rounded-lg border border-stone-200 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm" : "max-w-md rounded-lg border border-stone-200 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm"}>{emptyMessage}</p>
  );

  if (collapsible) {
    return (
      <StatsPanelDisclosure
        className={className}
        collapseStorageKey={collapseStorageKey}
        defaultCollapsed={defaultCollapsed}
        persistCollapseState={persistCollapseState}
        title={title ?? "Stats Board"}
      >
        {content}
      </StatsPanelDisclosure>
    );
  }

  return (
    <section className={className} aria-labelledby={title ? "stats-panel-title" : undefined}>
      {title ? <h2 id="stats-panel-title" className="text-xl font-black text-slate-950">{title}</h2> : null}
      {content}
    </section>
  );
}
