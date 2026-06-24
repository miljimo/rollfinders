import type { ReactNode } from "react";

export type PaymentAccountSetupStatus = "active" | "pending" | "disabled";

export type PaymentAccountSetupItem = {
  id: string;
  label: string;
  statusLabel: string;
  complete?: boolean;
};

export type PaymentAccountSetupProps = {
  accountLabel?: string;
  accountStatusLabel?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  detailsHref?: string;
  detailsLabel?: string;
  icon?: ReactNode;
  items: PaymentAccountSetupItem[];
  providerName: string;
  status?: PaymentAccountSetupStatus;
  title?: string;
  variant?: "default" | "compact";
};
