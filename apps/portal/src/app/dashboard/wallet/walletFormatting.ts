import type { AutoCompleteTextFieldOption } from "@/app/_components/AutoCompleteTextField";
import type { WalletRecord } from "@/lib/wallet-service";

export function walletOption(wallet: WalletRecord): AutoCompleteTextFieldOption {
  return {
    id: wallet.id,
    label: `${wallet.walletType === "external" ? "External" : "Internal"} wallet - ${wallet.ownerId}`,
    description: `${wallet.currency} - ${wallet.status}`,
    meta: wallet.id,
  };
}

export function walletMoney(amountMinor: number, currency: string) {
  if (currency === "Points") {
    return `${amountMinor.toLocaleString("en-GB")} Points`;
  }
  return new Intl.NumberFormat("en-GB", { currency, style: "currency" }).format(amountMinor / 100);
}

export function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value;
}
