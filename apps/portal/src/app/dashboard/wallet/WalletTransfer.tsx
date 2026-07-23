"use client";

import { useMemo, useState } from "react";

import { AutoCompleteTextField } from "@/app/_components/AutoCompleteTextField";
import { Button } from "@/app/_components/Button";
import type { WalletBalance, WalletRecord } from "@/lib/wallet-service";
import { SourceWalletBalance } from "./SourceWalletBalance";
import { walletOption } from "./walletFormatting";

export function WalletTransfer({
  action,
  balances,
  cancelHref,
  wallets,
}: {
  action: (formData: FormData) => void | Promise<void>;
  balances: WalletBalance[];
  cancelHref: string;
  wallets: WalletRecord[];
}) {
  const [sourceWalletId, setSourceWalletId] = useState("");
  const [destinationWalletId, setDestinationWalletId] = useState("");
  const walletOptions = useMemo(() => wallets.map(walletOption), [wallets]);
  const destinationWalletOptions = useMemo(
    () => walletOptions.filter((option) => option.id !== sourceWalletId),
    [sourceWalletId, walletOptions],
  );
  const sourceWallet = wallets.find((wallet) => wallet.id === sourceWalletId);
  const sourceBalance = balances.find((balance) => balance.walletId === sourceWalletId);

  function handleSourceWalletChange(selectedId: string) {
    setSourceWalletId(selectedId);
    if (selectedId && selectedId === destinationWalletId) {
      setDestinationWalletId("");
    }
  }

  return (
    <form action={action} className="mt-5 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="returnTo" value="/dashboard/wallet?walletView=transactions" />
      <input type="hidden" name="currency" value={sourceWallet?.currency ?? "GBP"} />
      <AutoCompleteTextField
        emptyMessage="No wallets found."
        label="Source wallet"
        name="sourceWalletId"
        onSelectedIdChange={handleSourceWalletChange}
        options={walletOptions}
        placeholder="Search by wallet type, owner, currency, status, or wallet id"
        selectedId={sourceWalletId}
      />
      <SourceWalletBalance balance={sourceBalance} currency={sourceWallet?.currency} />
      <AutoCompleteTextField
        key={sourceWalletId}
        emptyMessage={sourceWalletId ? "No other wallets found." : "No wallets found."}
        label="Destination wallet"
        name="destinationWalletId"
        onSelectedIdChange={setDestinationWalletId}
        options={destinationWalletOptions}
        placeholder="Search by wallet type, owner, currency, status, or wallet id"
        selectedId={destinationWalletId}
      />
      <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
        Reference
        <input name="reference" className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal text-stone-950" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
        Amount
        <input name="amount" inputMode="decimal" placeholder="0.00" className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal text-stone-950" />
      </label>
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-stone-100 pt-4">
        <p className="max-w-xl text-sm font-semibold text-slate-600">Transfers are created between wallet owner accounts using the selected source and destination wallets.</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button href={cancelHref} variant="secondary">
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create Transfer
          </Button>
        </div>
      </div>
    </form>
  );
}
