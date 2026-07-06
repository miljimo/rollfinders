import Link from "next/link";
import type { LinkedWalletAccount, WalletTransaction } from "@/lib/wallet-service";
import { ActionMenu } from "../../admin/ActionMenu";
import type { WalletRow } from "./walletDashboardTypes";
import { transactionDetailsHref, walletDisconnectLinkedAccountHref, walletLinkAccountHref } from "./walletDashboardUrls";

const walletMenuItemClass = "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50";

export function TransactionActionMenu({ transaction }: { transaction: WalletTransaction }) {
  const inProgress = ["pending", "processing", "in_progress"].includes(transaction.status.toLowerCase());

  return (
    <ActionMenu label={`Open actions for transaction ${transaction.id}`} buttonClassName="inline-flex size-9 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-50" trigger={<span className="text-xl font-black leading-none" aria-hidden>...</span>}>
      <Link href={transactionDetailsHref({}, transaction.id)} className={walletMenuItemClass} role="menuitem">
        View Transaction Details
      </Link>
      {inProgress ? <button type="button" className={walletMenuItemClass} role="menuitem">Cancel Transaction</button> : <span className="block rounded-md px-3 py-2.5 text-sm font-semibold text-slate-400" role="menuitem">Cancel Transaction unavailable</span>}
    </ActionMenu>
  );
}

export function WalletActionMenu({ wallet }: { wallet: WalletRow }) {
  const externalWalletWithoutAccount = wallet.walletType === "external" && !wallet.linkedAccount;
  const pendingStripeAccount = isPendingStripeLinkedAccount(wallet.linkedAccount);
  const canDisconnectLinkedAccount = wallet.walletType === "external" && !!wallet.linkedAccount;

  return (
    <ActionMenu label={`Open actions for wallet ${wallet.id}`} buttonClassName="inline-flex size-9 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-50" trigger={<span className="text-xl font-black leading-none" aria-hidden>...</span>}>
      <Link href={`/dashboard/wallet?walletDialog=wallet-details&walletId=${encodeURIComponent(wallet.id)}`} className={walletMenuItemClass} role="menuitem">View Wallet Details</Link>
      {externalWalletWithoutAccount ? <Link href={walletLinkAccountHref(wallet)} className={walletMenuItemClass} role="menuitem">Link Account</Link> : null}
      {pendingStripeAccount ? <Link href={walletLinkAccountHref(wallet)} className={walletMenuItemClass} role="menuitem">Continue Stripe Connect</Link> : null}
      {canDisconnectLinkedAccount && wallet.linkedAccount ? <Link href={walletDisconnectLinkedAccountHref(wallet.id)} className={walletMenuItemClass} role="menuitem">Disconnect Linked Account</Link> : null}
    </ActionMenu>
  );
}

function isPendingStripeLinkedAccount(account?: LinkedWalletAccount) {
  return account?.provider === "STRIPE" && account.status === "PENDING";
}

