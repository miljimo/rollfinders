import { ArrowDownLeft, ArrowUpRight, CheckCircle2, CreditCard, FileText, Globe2, Link2, Repeat2, Wallet } from "lucide-react";

import { Button } from "@/app/_components/Button";
import { DialogShell } from "@/app/_components/DialogShell";
import { SummaryTile } from "@/app/_components/SummaryTile";
import { TableStatusBadge } from "@/app/_components/Table";
import { formatDate } from "@/lib/utils";
import type { WalletTransaction } from "@/lib/wallet-service";

import { walletMoney } from "./walletFormatting";
import { TransactionDetailRow, TransactionDetailSection, TransactionWalletCard } from "./WalletTransactionDetailsParts";

export function WalletTransactionDetailsDialog({ closeHref, transaction }: { closeHref: string; transaction: WalletTransaction }) {
  const typeLabel = transaction.type.replaceAll("_", " ");
  const statusLabel = transaction.status.toUpperCase();
  const amount = walletMoney(transaction.amount, transaction.currency);
  const created = formatDate(transaction.createdAt);

  return (
    <DialogShell closeHref={closeHref} description="Review wallet transaction IDs, status, amount, wallets, and references." maxWidthClass="max-w-7xl" title="Transaction Details">
      <div className="mt-6 grid gap-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile className="min-h-28 rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm" icon={<CreditCard size={18} aria-hidden />} label="Amount" value={amount} />
          <SummaryTile className="min-h-28 rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm" icon={<CheckCircle2 size={18} aria-hidden />} label="Status" value={statusLabel} />
          <SummaryTile className="min-h-28 rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm" icon={<Repeat2 size={18} aria-hidden />} label="Type" value={typeLabel} />
          <SummaryTile className="min-h-28 rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm" icon={<Globe2 size={18} aria-hidden />} label="Currency" value={transaction.currency} />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <TransactionDetailSection icon={<FileText size={22} aria-hidden />} title="1. Transaction Overview">
            <TransactionDetailRow copyable label="Transaction ID" value={transaction.id} />
            <TransactionDetailRow label="Type" value={typeLabel} />
            <TransactionDetailRow label="Status" value={<TableStatusBadge status={statusLabel} />} />
            <TransactionDetailRow label="Amount" value={amount} />
            <TransactionDetailRow label="Currency" value={transaction.currency} />
            <TransactionDetailRow label="Created" value={created} />
          </TransactionDetailSection>
          <TransactionDetailSection icon={<Wallet size={22} aria-hidden />} title="2. Wallets">
            <TransactionWalletCard icon={<ArrowUpRight size={28} aria-hidden />} label="Source Wallet" tone="blue" value={transaction.sourceWalletId || "None"} />
            <TransactionWalletCard icon={<ArrowDownLeft size={28} aria-hidden />} label="Destination Wallet" tone="green" value={transaction.destinationWalletId || "None"} />
          </TransactionDetailSection>
        </div>
        <TransactionDetailSection icon={<Link2 size={22} aria-hidden />} title="3. References & System Details">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <TransactionDetailRow label="Reference Type" value={transaction.referenceType || "None"} />
              <TransactionDetailRow copyable={Boolean(transaction.referenceId)} label="Reference ID" value={transaction.referenceId || "None"} />
              <TransactionDetailRow copyable={Boolean(transaction.idempotencyKey)} label="Idempotency Key" value={transaction.idempotencyKey || "None"} />
            </div>
            <div className="lg:border-l lg:border-stone-100 lg:pl-6">
              <TransactionDetailRow label="Original Transaction" value={transaction.originalTransactionId || "None"} />
              <TransactionDetailRow label="Created" value={created} />
            </div>
          </div>
        </TransactionDetailSection>
        <div className="flex justify-end">
          <Button href={closeHref} variant="secondary" className="min-h-11 px-7">Close</Button>
        </div>
      </div>
    </DialogShell>
  );
}
