import { clsx } from "clsx";
import { Activity, CalendarDays, Clock, CreditCard, Info, Landmark, Link2, Tag, User, Wallet } from "lucide-react";

import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import { formatDate } from "@/lib/utils";
import type { LinkedWalletAccount, WalletRecord } from "@/lib/wallet-service";

import { titleCase } from "./walletFormatting";
import { WalletDetailsBadge, WalletDetailsRow } from "./WalletDetailsParts";

export function WalletDetailsDialog({ closeHref, linkedAccount, wallet }: { closeHref: string; linkedAccount?: LinkedWalletAccount; wallet: WalletRecord }) {
  const canLinkExternalAccount = wallet.walletType === "external" && !linkedAccount;
  const canContinueStripeConnect = wallet.walletType === "external" && linkedAccount?.provider === "STRIPE" && linkedAccount.status === "PENDING";
  const providerLabel = linkedAccount?.displayName || linkedAccount?.provider || "Not linked";
  const walletInfoRows = [
    { icon: <Wallet size={22} aria-hidden />, label: "Wallet ID", value: wallet.id, tone: "blue" },
    { icon: <Tag size={22} aria-hidden />, label: "Wallet Type", value: titleCase(wallet.walletType), tone: "purple", badge: true },
    { icon: <User size={22} aria-hidden />, label: "Owner ID", value: wallet.ownerId, tone: "blue" },
    { icon: <CreditCard size={22} aria-hidden />, label: "Currency", value: wallet.currency, tone: "green" },
    { icon: <Activity size={22} aria-hidden />, label: "Status", value: titleCase(wallet.status), tone: "green", badge: true },
    { icon: <CalendarDays size={22} aria-hidden />, label: "Created", value: formatDate(wallet.createdAt), tone: "blue" },
    { icon: <Clock size={22} aria-hidden />, label: "Updated", value: formatDate(wallet.updatedAt), tone: "blue" },
  ];
  const linkedAccountRows = linkedAccount ? [
    { icon: <Landmark size={22} aria-hidden />, label: "Linked Account / Provider", value: providerLabel },
    { icon: <User size={22} aria-hidden />, label: "Provider Account", value: linkedAccount.providerAccountId || linkedAccount.externalReference || "None" },
    { icon: <Activity size={22} aria-hidden />, label: "Provider Status", value: titleCase(linkedAccount.status), badge: true },
    { icon: <Link2 size={22} aria-hidden />, label: "Connection Type", value: linkedAccount.connectionType },
  ] : [];

  return (
    <DialogShell closeHref={closeHref} description="Review wallet owner, type, currency, and status." maxWidthClass="max-w-6xl" title="Wallet Details">
      {canLinkExternalAccount || canContinueStripeConnect ? (
        <div className="mt-5 flex justify-end">
          <Button href={`/dashboard/wallet/${encodeURIComponent(wallet.id)}/link-account`} variant="primary">
            {canContinueStripeConnect ? <CreditCard size={18} aria-hidden /> : <Link2 size={18} aria-hidden />}
            {canContinueStripeConnect ? "Continue Stripe Connect" : "Link Account"}
          </Button>
        </div>
      ) : null}
      <section className="mt-5 rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <Info size={23} aria-hidden />
          </span>
          <h3 className="text-xl font-black text-slate-950">Wallet Information</h3>
        </div>
        <dl className="mt-5 grid md:grid-cols-2">
          {walletInfoRows.map((row, index) => (
            <WalletDetailsRow key={row.label} icon={row.icon} label={row.label} tone={row.tone} value={row.badge ? <WalletDetailsBadge status={String(row.value)} /> : row.value} className={clsx(index % 2 === 0 ? "md:border-r md:pr-5" : "md:pl-5", index > 1 && "border-t")} />
          ))}
        </dl>
      </section>
      {wallet.walletType === "external" && linkedAccount ? (
        <section className="mt-5 rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700">
              <Link2 size={23} aria-hidden />
            </span>
            <h3 className="text-xl font-black text-slate-950">Linked Accounts</h3>
          </div>
          <dl className="mt-5 grid gap-0">
            {linkedAccountRows.map((row) => (
              <WalletDetailsRow key={row.label} icon={row.icon} label={row.label} tone="purple" value={row.badge ? <WalletDetailsBadge status={String(row.value)} /> : row.value} />
            ))}
          </dl>
        </section>
      ) : null}
    </DialogShell>
  );
}
