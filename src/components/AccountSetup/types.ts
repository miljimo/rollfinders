import type { ReactNode } from "react";

export type AccountSetupStatus = "active" | "pending" | "disabled";

export type AccountSetupItem = {
  id: string;
  label: string;
  statusLabel: string;
  complete?: boolean;
};

export type AccountSetupProps = {
  accountLabel?: string;
  accountStatusLabel?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  detailsHref?: string;
  detailsLabel?: string;
  icon?: ReactNode;
  items: AccountSetupItem[];
  providerName: string;
  status?: AccountSetupStatus;
  title?: string;
};
