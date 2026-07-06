import type { WalletBalance } from "@/lib/wallet-service";
import { walletMoney } from "./walletFormatting";

export function SourceWalletBalance({ balance, currency }: { balance?: WalletBalance; currency?: string }) {
  const label = balance ? walletMoney(balance.balance, balance.currency) : currency ? walletMoney(0, currency) : "Select a source wallet";

  return (
    <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm">
      <span className="block font-semibold text-teal-950">Source wallet balance</span>
      <span className="font-bold text-teal-900">{label}</span>
    </div>
  );
}

