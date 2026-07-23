import { DialogShell } from "@/app/_components/DialogShell";
import type { ManagedUser } from "@/lib/users-service";
import type { WalletRecord } from "@/lib/wallet-service";

import { CreateWalletForm } from "./CreateWalletForm";
import {
  selectedWalletOwnerId,
  type DashboardSearchParams,
  type WalletOwnerUser,
} from "./walletDialogTypes";

export function CreateWalletDialog({
  currentUser,
  params,
  users,
  wallets,
}: {
  currentUser: WalletOwnerUser;
  params: DashboardSearchParams;
  users: ManagedUser[];
  wallets: WalletRecord[];
}) {
  const ownerId = selectedWalletOwnerId(params, currentUser.id, users);
  const owner = users.find((user) => user.id === ownerId);
  const ownerDisplayName = owner
    ? (owner.name ?? owner.email)
    : currentUser.name;

  return (
    <DialogShell
      closeHref="/dashboard/wallet"
      description="Create an internal or external wallet for an owner account."
      maxWidthClass="max-w-2xl"
      title="Create Wallet"
    >
      <CreateWalletForm
        currentUser={currentUser}
        ownerDisplayName={ownerDisplayName}
        ownerId={ownerId}
        params={params}
        users={users}
        wallets={wallets}
      />
    </DialogShell>
  );
}
