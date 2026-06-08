import type { ReactNode } from "react";
import type { StatIndicatorTone } from "@/components/StatIndicator";

export type StatsPanelItem = {
  id: string;
  label: string;
  value: number | string;
  icon: ReactNode;
  iconTone?: "blue" | "orange" | "teal" | "violet" | "neutral";
  indicator?: {
    label: string;
    tone?: StatIndicatorTone;
    value?: number | string;
    ariaLabel?: string;
  };
  active?: boolean;
  disabled?: boolean;
  href?: string;
  ariaLabel?: string;
};

export type StatsPanelProps = {
  title?: string;
  items: StatsPanelItem[];
  maxItems?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  persistCollapseState?: boolean;
  collapseStorageKey?: string;
  emptyBehavior?: "hide" | "message";
  emptyMessage?: string;
  className?: string;
};
