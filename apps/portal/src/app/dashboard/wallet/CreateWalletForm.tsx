"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/app/_components/Button";
import type { ManagedUser } from "@/lib/users-service";

import { createDashboardWallet } from "./actions";
import {
  walletOwnerPickerHref,
  type DashboardSearchParams,
  type WalletOwnerUser,
} from "./walletDialogTypes";

type WalletType = "internal" | "external";
type WalletCurrency = "GBP" | "Points";

type WalletSummary = {
  currency: WalletCurrency;
  ownerId: string;
  walletType: WalletType;
};

export function CreateWalletForm({
  currentUser,
  ownerId,
  ownerDisplayName,
  params,
  users,
  wallets,
}: {
  currentUser: WalletOwnerUser;
  ownerDisplayName: string;
  ownerId: string;
  params: DashboardSearchParams;
  users: ManagedUser[];
  wallets: WalletSummary[];
}) {
  const [walletType, setWalletType] = useState<WalletType>("external");
  const [currency, setCurrency] = useState<WalletCurrency>("GBP");

  const owner = users.find((user) => user.id === ownerId);
  const ownerEmail = owner ? owner.email : currentUser.email;
  const duplicateWallet = useMemo(
    () =>
      wallets.find(
        (wallet) =>
          wallet.ownerId === ownerId &&
          wallet.walletType === walletType &&
          wallet.currency === currency,
      ),
    [currency, ownerId, walletType, wallets],
  );
  const disabledReason = !ownerId
    ? "Choose an owner before creating a wallet."
    : duplicateWallet
      ? `${ownerDisplayName} already has a ${walletTypeLabel(walletType)} ${currency} wallet. Choose a different wallet type, currency, or owner.`
      : "";

  return (
    <form
      action={createDashboardWallet}
      className="mt-5 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="returnTo" value="/dashboard/wallet" />
      <label className="grid gap-2 text-sm font-bold text-stone-800">
        Owner
        <span className="flex min-w-0 gap-2">
          <input type="hidden" name="ownerId" value={ownerId} />
          <input
            readOnly
            value={ownerDisplayName}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-stone-200 bg-stone-50 px-3 font-normal text-slate-800"
          />
          <Button
            href={walletOwnerPickerHref(params, ownerId)}
            size="icon"
            variant="secondary"
            className="min-h-11 w-11 shrink-0"
            aria-label="Choose wallet owner"
          >
            <span className="text-xl font-black leading-none" aria-hidden>
              ...
            </span>
          </Button>
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {ownerEmail}
        </span>
      </label>
      <label className="grid gap-2 text-sm font-bold text-stone-800">
        Wallet type
        <select
          name="walletType"
          value={walletType}
          onChange={(event) => setWalletType(event.target.value as WalletType)}
          className="min-h-11 rounded-md border border-stone-200 px-3 font-normal text-slate-800"
        >
          <option value="external">External</option>
          <option value="internal">Internal</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-stone-800">
        Currency
        <select
          name="currency"
          value={currency}
          onChange={(event) =>
            setCurrency(event.target.value as WalletCurrency)
          }
          className="min-h-11 rounded-md border border-stone-200 px-3 font-normal text-slate-800"
        >
          <option value="GBP">GBP</option>
          <option value="Points">Points</option>
        </select>
      </label>
      {disabledReason ? (
        <p
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
          role="status"
        >
          {disabledReason}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4">
        <Button href="/dashboard/wallet" variant="secondary">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={Boolean(disabledReason)}
          title={disabledReason || undefined}
        >
          <Plus size={18} aria-hidden />
          Create Wallet
        </Button>
      </div>
    </form>
  );
}

function walletTypeLabel(walletType: WalletType) {
  return walletType === "external" ? "External" : "Internal";
}
