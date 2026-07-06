import type { LinkedWalletAccount, WalletBalance, WalletRecord } from "@/lib/wallet-service";

export type WalletDashboardSearchParams = Record<string, string | string[] | undefined>;
export type WalletDashboardView = "dashboard" | "transactions";

export type WalletRow = WalletRecord & {
  balance?: WalletBalance;
  linkedAccount?: LinkedWalletAccount;
};

