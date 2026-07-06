import { Ban } from "lucide-react";

import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import type { LinkedWalletAccount, WalletRecord } from "@/lib/wallet-service";

import { disconnectDashboardWalletLinkedAccount } from "./actions";

export function DisconnectWalletLinkedAccountDialog({ closeHref, linkedAccount, wallet }: { closeHref: string; linkedAccount: LinkedWalletAccount; wallet: WalletRecord }) {
  const providerLabel = linkedAccount.displayName || linkedAccount.provider;
  const providerAccount = linkedAccount.providerAccountId || linkedAccount.externalReference || "Not available";
  const sharedAccount = linkedAccount.connectedWalletCount > 1;

  return (
    <DialogShell closeHref={closeHref} description="Review the impact before disconnecting this external wallet account." title="Disconnect Linked Account">
      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold leading-6 text-amber-950">
        {sharedAccount
          ? `Disconnecting this linked account will only remove this wallet's reference to ${providerLabel}. The provider account is still connected to other wallets, so its details will be kept and the provider account will remain connected.`
          : `Disconnecting this linked account will disconnect ${providerLabel} from the payment service and disable the wallet link. The external wallet will become inactive until a provider account is linked again.`}
      </div>
      <dl className="mt-5 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        {[
          { label: "Wallet ID", value: wallet.id },
          { label: "Wallet Status", value: wallet.status },
          { label: "Linked Account", value: providerLabel },
          { label: "Provider", value: linkedAccount.provider },
          { label: "Provider Account", value: providerAccount },
          { label: "Connection Type", value: linkedAccount.connectionType },
          { label: "Connected Wallets", value: String(linkedAccount.connectedWalletCount) },
        ].map((row) => (
          <div key={row.label} className="grid gap-1 border-b border-stone-100 pb-3 last:border-b-0 last:pb-0 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-4">
            <dt className="text-sm font-black text-stone-600">{row.label}</dt>
            <dd className="break-all text-sm font-semibold text-slate-950">{row.value}</dd>
          </div>
        ))}
      </dl>
      <form action={disconnectDashboardWalletLinkedAccount} className="mt-5 flex flex-wrap justify-end gap-3 border-t border-stone-200 pt-4">
        <input type="hidden" name="returnTo" value="/dashboard/wallet" />
        <input type="hidden" name="walletId" value={wallet.id} />
        <input type="hidden" name="provider" value={linkedAccount.provider} />
        <input type="hidden" name="providerAccountId" value={linkedAccount.providerAccountId} />
        <input type="hidden" name="connectionType" value={linkedAccount.connectionType} />
        <input type="hidden" name="displayName" value={linkedAccount.displayName} />
        <input type="hidden" name="externalReference" value={linkedAccount.externalReference} />
        <input type="hidden" name="connectedWalletCount" value={String(linkedAccount.connectedWalletCount)} />
        <input type="hidden" name="currency" value={wallet.currency} />
        <Button href={closeHref} variant="secondary">Cancel</Button>
        <Button type="submit" variant="primary" className="bg-red-700 hover:bg-red-800">
          <Ban size={18} aria-hidden />
          Disconnect Account
        </Button>
      </form>
    </DialogShell>
  );
}
