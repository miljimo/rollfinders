import type { WalletTransaction, WalletRecord } from "@/lib/wallet-service";
import type { WalletDashboardSearchParams } from "./walletDashboardTypes";

export function selectedWallet(wallets: WalletRecord[], searchParams: WalletDashboardSearchParams) {
  const walletId = firstSearchParam(searchParams.walletId);
  if (!walletId) return null;
  return wallets.find((wallet) => wallet.id === walletId) ?? null;
}

export function walletDetailsCloseHref(searchParams: WalletDashboardSearchParams) {
  const params = walletSearchParams(searchParams, ["walletDialog", "walletId"]);
  const query = params.toString();
  return query ? `/dashboard/wallet?${query}` : "/dashboard/wallet";
}

export function selectedWalletTransaction(transactions: WalletTransaction[], searchParams: WalletDashboardSearchParams) {
  const transactionId = firstSearchParam(searchParams.walletTransactionId);
  if (!transactionId) return null;
  return transactions.find((transaction) => transaction.id === transactionId) ?? null;
}

export function transactionDetailsCloseHref(searchParams: WalletDashboardSearchParams) {
  const params = walletSearchParams(searchParams, ["walletDialog", "walletTransactionId"]);
  params.set("walletView", "transactions");
  const query = params.toString();
  return query ? `/dashboard/wallet?${query}` : "/dashboard/wallet?walletView=transactions";
}

export function walletPageHref(searchParams: WalletDashboardSearchParams, page: number) {
  const params = walletSearchParams(searchParams, ["walletPage", "walletResult", "walletError", "walletDialog"]);
  if (page > 1) params.set("walletPage", String(page));
  const query = params.toString();
  return query ? `/dashboard/wallet?${query}` : "/dashboard/wallet";
}

export function transactionPageHref(searchParams: WalletDashboardSearchParams, page: number) {
  const params = walletSearchParams(searchParams, ["transactionPage", "walletResult", "walletError", "walletDialog", "walletTransactionId"]);
  params.set("walletView", "transactions");
  if (page > 1) params.set("transactionPage", String(page));
  const query = params.toString();
  return query ? `/dashboard/wallet?${query}` : "/dashboard/wallet?walletView=transactions";
}

export function transactionDetailsHref(searchParams: WalletDashboardSearchParams, transactionId: string) {
  const params = walletSearchParams(searchParams, ["walletDialog", "walletTransactionId"]);
  params.set("walletView", "transactions");
  params.set("walletDialog", "transaction-details");
  params.set("walletTransactionId", transactionId);
  return `/dashboard/wallet?${params.toString()}`;
}

export function walletDetailsHref(searchParams: WalletDashboardSearchParams, walletId: string) {
  const params = walletSearchParams(searchParams, ["walletDialog", "walletId"]);
  params.set("walletDialog", "wallet-details");
  params.set("walletId", walletId);
  return `/dashboard/wallet?${params.toString()}`;
}

export function walletLinkAccountHref(wallet: Pick<WalletRecord, "id">) {
  return `/dashboard/wallet/${encodeURIComponent(wallet.id)}/link-account`;
}

export function walletDisconnectLinkedAccountHref(walletId: string) {
  return `/dashboard/wallet?walletDialog=disconnect-linked-account&walletId=${encodeURIComponent(walletId)}`;
}

export function pageFromSearchParams(searchParams: WalletDashboardSearchParams, key: string) {
  const value = firstSearchParam(searchParams[key]);
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function walletSearchParams(searchParams: WalletDashboardSearchParams, omittedKeys: string[]) {
  const params = new URLSearchParams();
  const omitted = new Set(omittedKeys);
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value || omitted.has(key)) return;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else params.set(key, value);
  });
  return params;
}

