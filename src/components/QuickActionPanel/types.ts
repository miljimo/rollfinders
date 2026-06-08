import type { ReactNode } from "react";

export type QuickActionPanelItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  metadata?: Record<string, unknown>;
};

export type QuickActionPanelProps = {
  items: QuickActionPanelItem[];
  title?: string;
  headingLevel?: 2 | 3 | 4;
  maxItems?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  persistCollapseState?: boolean;
  collapseStorageKey?: string;
  emptyBehavior?: "hide" | "message";
  emptyMessage?: string;
  emptyState?: ReactNode;
  className?: string;
};
