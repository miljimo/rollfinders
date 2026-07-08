import { ChevronRight } from "lucide-react";
import { PanelItemSurface } from "@/components/PanelItemSurface";
import type { QuickActionPanelItem } from "./types";

export type ActionItemProps = {
  item: QuickActionPanelItem;
};

export function ActionItem({ item }: ActionItemProps) {
  const ariaLabel = item.ariaLabel ?? `${item.title}: ${item.description}`;

  return (
    <PanelItemSurface
      active={item.active}
      ariaLabel={ariaLabel}
      disabled={item.disabled}
      href={item.href}
      icon={item.icon}
      trailing={<ChevronRight size={20} aria-hidden />}
    >
      <span className="block text-base font-black leading-6 text-slate-950 [overflow-wrap:anywhere]">{item.title}</span>
      <span className="mt-1 block text-sm font-semibold leading-6 text-slate-500 [overflow-wrap:anywhere]">{item.description}</span>
    </PanelItemSurface>
  );
}
