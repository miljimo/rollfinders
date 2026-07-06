import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import type { ManagedUser } from "@/lib/users-service";

import { createWalletHref, selectedWalletOwnerId, type DashboardSearchParams, type WalletOwnerUser } from "./walletDialogTypes";

export function WalletOwnerPickerDialog({ currentUser, params, users }: { currentUser: WalletOwnerUser; params: DashboardSearchParams; users: ManagedUser[] }) {
  const selectedOwnerId = selectedWalletOwnerId(params, currentUser.id, users);
  const currentUserOption: ManagedUser = {
    academyId: null,
    createdAt: "",
    disabled: false,
    email: currentUser.email,
    emailStatus: "",
    id: currentUser.id,
    isProtected: false,
    lastLoginAt: null,
    name: currentUser.name,
    role: "",
    status: "",
  };
  const sortedUsers = [currentUserOption, ...users.filter((user) => user.id !== currentUser.id)]
    .sort((left, right) => (left.name ?? left.email).localeCompare(right.name ?? right.email));

  return (
    <DialogShell closeHref={createWalletHref(params, selectedOwnerId)} description="Choose a user you have permission to manage as the wallet owner." maxWidthClass="max-w-3xl" title="Attach Wallet Owner">
      <div className="mt-5 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        {sortedUsers.length ? (
          <ul className="divide-y divide-stone-100">
            {sortedUsers.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{user.name ?? user.email}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{user.email}</p>
                  <p className="truncate font-mono text-xs text-slate-500">{user.id}</p>
                </div>
                <Button href={createWalletHref(params, user.id)} variant={user.id === selectedOwnerId ? "secondary" : "primary"} className="min-h-10 px-4">
                  {user.id === selectedOwnerId ? "Selected" : "Select"}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-sm font-semibold text-slate-600">No users are available for your current permissions.</p>
        )}
      </div>
    </DialogShell>
  );
}
