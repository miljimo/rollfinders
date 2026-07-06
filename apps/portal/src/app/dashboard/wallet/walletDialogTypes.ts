import type { ManagedUser } from "@/lib/users-service";

export type DashboardSearchParams = Record<string, string | string[] | undefined>;

export type WalletOwnerUser = {
  email: string;
  id: string;
  name: string;
};

export function firstWalletParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function selectedWalletOwnerId(params: DashboardSearchParams, currentUserId: string, users: ManagedUser[]) {
  const ownerId = firstWalletParam(params.walletOwnerId);
  if (!ownerId) return currentUserId;
  return users.some((user) => user.id === ownerId) || ownerId === currentUserId ? ownerId : currentUserId;
}

function walletDialogHref(params: DashboardSearchParams, ownerId: string, dialog: string) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value || key === "walletDialog" || key === "walletOwnerId") return;
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
      return;
    }
    query.set(key, value);
  });
  query.set("walletDialog", dialog);
  query.set("walletOwnerId", ownerId);
  return `/dashboard/wallet?${query.toString()}`;
}

export function createWalletHref(params: DashboardSearchParams, ownerId: string) {
  return walletDialogHref(params, ownerId, "create-wallet");
}

export function walletOwnerPickerHref(params: DashboardSearchParams, ownerId: string) {
  return walletDialogHref(params, ownerId, "select-wallet-owner");
}
