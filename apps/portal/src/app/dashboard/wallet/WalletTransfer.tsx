"use client";

import { useMemo, useState } from "react";

import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";
import { Button } from "@/components/Button";
import type { WalletBalance, WalletRecord } from "@/lib/wallet-service";

export function WalletTransfer({
  balances,
  cancelHref,
  wallets,
}: {
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
  const disabledReason = "Transfer creation is not available yet because the dashboard submit action is not connected to the wallet transfer API.";

  function handleSourceWalletChange(selectedId: string) {
    setSourceWalletId(selectedId);
    if (selectedId && selectedId === destinationWalletId) {
      setDestinationWalletId("");
    }
  }

  return (
    <form className="mt-5 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
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
        <p id="wallet-transfer-disabled-reason" className="max-w-xl text-sm font-semibold text-amber-800">
          {disabledReason}
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button href={cancelHref} variant="secondary">
            Cancel
          </Button>
          <Button disabled variant="primary" aria-describedby="wallet-transfer-disabled-reason" title={disabledReason}>
            Create Transfer
          </Button>
        </div>
      </div>
    </form>
  );
}

function SourceWalletBalance({ balance, currency }: { balance?: WalletBalance; currency?: string }) {
  const label = balance ? money(balance.balance, balance.currency) : currency ? money(0, currency) : "Select a source wallet";

  return (
    <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm">
      <span className="block font-semibold text-teal-950">Source wallet balance</span>
      <span className="font-bold text-teal-900">{label}</span>
    </div>
  );
}

function walletOption(wallet: WalletRecord): AutoCompleteTextFieldOption {
  return {
    id: wallet.id,
    label: `${wallet.walletType === "external" ? "External" : "Internal"} wallet - ${wallet.ownerId}`,
    description: `${wallet.currency} - ${wallet.status}`,
    meta: wallet.id,
  };
}

function money(amountMinor: number, currency: string) {
  if (currency === "Points") {
    return `${amountMinor.toLocaleString("en-GB")} Points`;
  }
  return new Intl.NumberFormat("en-GB", { currency, style: "currency" }).format(amountMinor / 100);
}
