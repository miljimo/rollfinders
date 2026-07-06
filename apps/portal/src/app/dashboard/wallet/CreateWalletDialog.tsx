import { Plus } from "lucide-react";

import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import type { ManagedUser } from "@/lib/users-service";

import { createDashboardWallet } from "./actions";
import { selectedWalletOwnerId, walletOwnerPickerHref, type DashboardSearchParams, type WalletOwnerUser } from "./walletDialogTypes";

export function CreateWalletDialog({ currentUser, params, users }: { currentUser: WalletOwnerUser; params: DashboardSearchParams; users: ManagedUser[] }) {
  const ownerId = selectedWalletOwnerId(params, currentUser.id, users);
  const owner = users.find((user) => user.id === ownerId);
  const ownerDisplayName = owner ? owner.name ?? owner.email : currentUser.name;

  return (
    <DialogShell closeHref="/dashboard/wallet" description="Create an internal or external wallet for an owner account." maxWidthClass="max-w-2xl" title="Create Wallet">
      <form action={createDashboardWallet} className="mt-5 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="returnTo" value="/dashboard/wallet" />
        <label className="grid gap-2 text-sm font-bold text-stone-800">
          Wallet type
          <select name="walletType" defaultValue="external" className="min-h-11 rounded-md border border-stone-200 px-3 font-normal text-slate-800">
            <option value="external">External</option>
            <option value="internal">Internal</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-stone-800">
          Owner
          <span className="flex min-w-0 gap-2">
            <input type="hidden" name="ownerId" value={ownerId} />
            <input readOnly value={ownerDisplayName} className="min-h-11 min-w-0 flex-1 rounded-md border border-stone-200 bg-stone-50 px-3 font-normal text-slate-800" />
            <Button href={walletOwnerPickerHref(params, ownerId)} size="icon" variant="secondary" className="min-h-11 w-11 shrink-0" aria-label="Choose wallet owner">
              <span className="text-xl font-black leading-none" aria-hidden>...</span>
            </Button>
          </span>
          <span className="text-xs font-semibold text-slate-500">{owner ? owner.email : currentUser.email}</span>
        </label>
        <label className="grid gap-2 text-sm font-bold text-stone-800">
          Currency
          <select name="currency" defaultValue="GBP" className="min-h-11 rounded-md border border-stone-200 px-3 font-normal text-slate-800">
            <option value="GBP">GBP</option>
            <option value="Points">Points</option>
          </select>
        </label>
        <div className="flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4">
          <Button href="/dashboard/wallet" variant="secondary">Cancel</Button>
          <Button type="submit" variant="primary">
            <Plus size={18} aria-hidden />
            Create Wallet
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
