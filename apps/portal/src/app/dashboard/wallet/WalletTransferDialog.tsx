import { DialogShell } from "@/components/DialogShell";
import type { WalletBalance, WalletRecord } from "@/lib/wallet-service";

import { WalletTransfer } from "./WalletTransfer";
import { createDashboardWalletTransfer } from "./actions";

export function WalletTransferDialog({ balances, canCreateTransfer, wallets }: { balances: WalletBalance[]; canCreateTransfer: boolean; wallets: WalletRecord[] }) {
  return (
    <DialogShell closeHref="/dashboard/wallet?walletView=transactions" description="Create a wallet-to-wallet transfer from the wallet service dashboard." title="Wallet Transfer">
      {canCreateTransfer ? (
        <WalletTransfer action={createDashboardWalletTransfer} balances={balances} cancelHref="/dashboard/wallet?walletView=transactions" wallets={wallets} />
      ) : (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-900">
          You do not have permission to create wallet transfers. Ask an administrator to assign the wallet.transfer privilege to your account.
        </div>
      )}
    </DialogShell>
  );
}
