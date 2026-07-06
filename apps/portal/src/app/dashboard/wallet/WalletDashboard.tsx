import type { LinkedWalletAccount, WalletBalance, WalletPaginationMeta, WalletRecord, WalletTransaction } from "@/lib/wallet-service";
import { WalletMessage } from "./WalletMessage";
import { WalletsDashboard } from "./WalletsDashboard";
import { WalletTransactionsDashboard } from "./WalletTransactionsDashboard";
import type { WalletDashboardSearchParams, WalletDashboardView } from "./walletDashboardTypes";

export { selectedWallet, selectedWalletTransaction, transactionDetailsCloseHref, walletDetailsCloseHref } from "./walletDashboardUrls";

export function WalletDashboard({
  balances,
  error,
  linkedAccounts,
  pagination,
  searchParams,
  transactions,
  view = "dashboard",
  wallets,
}: {
  balances: WalletBalance[];
  error?: string;
  linkedAccounts: LinkedWalletAccount[];
  pagination: WalletPaginationMeta;
  searchParams: WalletDashboardSearchParams;
  transactions: WalletTransaction[];
  view?: WalletDashboardView;
  wallets: WalletRecord[];
}) {
  const rows = wallets.map((wallet) => {
    return {
      ...wallet,
      balance: balances.find((balance) => balance.walletId === wallet.id),
      linkedAccount: linkedAccounts.find((account) => account.walletId === wallet.id && account.status !== "DISABLED"),
    };
  });
  return (
    <div className="grid gap-5">
      {error ? <WalletMessage message={error} tone="warning" /> : null}

      {view === "transactions" ? (
        <WalletTransactionsDashboard searchParams={searchParams} transactions={transactions} />
      ) : (
        <WalletsDashboard pagination={pagination} rows={rows} searchParams={searchParams} />
      )}
    </div>
  );
}
