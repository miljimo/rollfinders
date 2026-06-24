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
      <span className="block break-words font-black text-slate-950">{item.title}</span>
      <span className="mt-1 block break-words text-sm font-semibold text-slate-500">{item.description}</span>
    </PanelItemSurface>
  );
}
