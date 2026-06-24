import type { ReactNode } from "react";

export type PanelItemSurfaceProps = {
  active?: boolean;
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  href?: string;
  icon?: ReactNode;
  iconClassName?: string;
  role?: string;
  trailing?: ReactNode;
};
