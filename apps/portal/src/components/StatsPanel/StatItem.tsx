import { PanelItemSurface } from "@/components/PanelItemSurface";
import { StatIndicator } from "@/components/StatIndicator";
import type { StatsPanelItem } from "./types";

const iconToneClass: Record<NonNullable<StatsPanelItem["iconTone"]>, string> = {
  blue: "bg-blue-50 text-blue-600",
  orange: "bg-orange-50 text-orange-600",
  teal: "bg-teal-50 text-teal-700",
  violet: "bg-violet-50 text-violet-600",
  neutral: "bg-stone-100 text-slate-600",
};

export type StatItemProps = {
  item: StatsPanelItem;
};

export function StatItem({ item }: StatItemProps) {
  const value = typeof item.value === "number" ? item.value.toLocaleString() : item.value;
  const ariaLabel = item.ariaLabel ?? `${item.label}: ${value}`;

  return (
    <PanelItemSurface
      active={item.active}
      ariaLabel={ariaLabel}
      disabled={item.disabled}
      href={item.href}
      icon={item.icon}
      iconClassName={`size-16 rounded-full ${iconToneClass[item.iconTone ?? "neutral"]}`}
      role={item.href || item.disabled ? "link" : "group"}
    >
      <span className="block break-words text-sm font-bold text-slate-600">{item.label}</span>
      <span className="mt-1 block text-3xl font-black text-slate-950">{value}</span>
      {item.indicator ? (
        <StatIndicator
          ariaLabel={item.indicator.ariaLabel}
          className="mt-2"
          label={item.indicator.label}
          tone={item.indicator.tone}
          value={item.indicator.value}
        />
      ) : null}
    </PanelItemSurface>
  );
}
