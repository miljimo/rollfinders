"use client";

import {
  GridDashboard as SharedGridDashboard,
  GridItemDashboard as SharedGridItemDashboard,
} from "@miljimo/react-components";
import type {
  GridDashboardItem as SharedGridDashboardItem,
  GridItemDashboardProps,
} from "@miljimo/react-components";
import { isValidElement, type ReactNode } from "react";

import { Icon, type SidePanelIcon } from "@/app/_components/Icons";

export type { GridItemDashboardProps };

export type GridDashboardItem = Omit<SharedGridDashboardItem, "icon"> & {
  icon: ReactNode | SidePanelIcon;
};

type GridDashboardProps<TItem extends GridDashboardItem = GridDashboardItem> = {
  alwaysShowPagination?: boolean;
  emptyMessage?: string;
  getItemClassName?: (item: TItem) => string;
  getItemKey?: (item: TItem) => string;
  getSearchText?: (item: TItem) => string;
  items: TItem[];
  itemsPerPage?: number;
  paginationLabel?: string;
  renderItem?: (item: TItem, className: string) => ReactNode;
  searchLabel?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
};

const DEFAULT_ITEM_CLASS_NAME = "sm:col-span-6 xl:col-span-4";
const SIDE_PANEL_ICONS = new Set<string>([
  "academies",
  "accessKeys",
  "approvals",
  "bookings",
  "claims",
  "dashboard",
  "downgrades",
  "entitlements",
  "events",
  "features",
  "help",
  "limits",
  "logout",
  "map",
  "mfa",
  "payments",
  "plans",
  "products",
  "payouts",
  "permissions",
  "reserves",
  "roles",
  "settings",
  "subscribers",
  "transactions",
  "transfers",
  "users",
  "wallet",
]);

function dashboardIcon(icon: ReactNode | SidePanelIcon) {
  if (typeof icon === "string" && SIDE_PANEL_ICONS.has(icon)) {
    return <Icon name={icon as SidePanelIcon} size={24} className="shrink-0" />;
  }

  return isValidElement(icon) ? icon : null;
}

export function GridDashboard<TItem extends GridDashboardItem = GridDashboardItem>({
  getItemClassName,
  items,
  renderItem,
  ...props
}: GridDashboardProps<TItem>) {
  const gridItems = items.map((item) => ({
    ...item,
    icon: dashboardIcon(item.icon),
  }));

  return (
    <SharedGridDashboard
      {...props}
      getItemClassName={(item) => getItemClassName?.(item as TItem) ?? DEFAULT_ITEM_CLASS_NAME}
      items={gridItems}
      renderItem={renderItem ? (item, className) => renderItem(item as TItem, className) : undefined}
    />
  );
}

export function GridItemDashboard({ item, ...props }: GridItemDashboardProps) {
  return <SharedGridItemDashboard {...props} item={{ ...item, icon: dashboardIcon(item.icon) }} />;
}
