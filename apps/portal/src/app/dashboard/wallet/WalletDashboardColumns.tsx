import { TableStatusBadge, type TableColumn } from "@/app/_components/Table";
import type { WalletBalance, WalletTransaction } from "@/lib/wallet-service";
import { WalletActionMenu, TransactionActionMenu } from "./WalletActionMenus";
import type { WalletRow } from "./walletDashboardTypes";
import { walletMoney } from "./walletFormatting";

export const walletColumns: TableColumn<WalletRow>[] = [
  { key: "walletType", title: "Wallet Type", render: (_, row) => <span className="font-bold capitalize text-slate-950">{row.walletType}</span> },
  { key: "ownerId", title: "Owner ID", render: (_, row) => <span className="break-all font-mono text-xs text-slate-700">{row.ownerId}</span> },
  { key: "currency", title: "Currency", render: (_, row) => <span className="font-bold">{row.currency}</span> },
  { key: "balance", title: "Total Balance", render: (_, row) => <span className="font-bold text-slate-950">{formatWalletBalance(row.balance, row.currency)}</span> },
  { key: "status", title: "Status", render: (_, row) => <TableStatusBadge status={row.status} /> },
  { key: "actions", title: "Actions", className: "text-right", headerClassName: "text-right", render: (_, row) => <WalletActionMenu wallet={row} /> },
];

export const transactionColumns: TableColumn<WalletTransaction>[] = [
  { key: "createdAt", title: "Created", render: (_, row) => formatDateTime(row.createdAt) },
  { key: "type", title: "Ledger Type", render: (_, row) => <span className="font-bold capitalize text-slate-950">{row.type.replaceAll("_", " ")}</span> },
  { key: "amount", title: "Ledger Amount", render: (_, row) => walletMoney(row.amount, row.currency) },
  { key: "status", title: "Status", render: (_, row) => <TableStatusBadge status={row.status} /> },
  { key: "sourceWalletId", title: "Source Wallet", render: (_, row) => <WalletId value={row.sourceWalletId} /> },
  { key: "destinationWalletId", title: "Destination Wallet", render: (_, row) => <WalletId value={row.destinationWalletId} /> },
  { key: "referenceType", title: "Reference Type", render: (_, row) => row.referenceType ? <span className="font-semibold capitalize text-slate-700">{row.referenceType.replaceAll("_", " ")}</span> : "None" },
  { key: "referenceId", title: "Reference", render: (_, row) => row.referenceId ? <span className="break-all font-mono text-xs text-slate-700">{row.referenceId}</span> : "None" },
  { key: "actions", title: "Actions", className: "text-right", headerClassName: "text-right", render: (_, row) => <TransactionActionMenu transaction={row} /> },
];

function WalletId({ value }: { value?: string }) {
  if (!value) return <span className="text-slate-500">None</span>;
  return <span className="break-all font-mono text-xs text-slate-700">{value}</span>;
}

function formatWalletBalance(balance: WalletBalance | undefined, currency: string) {
  if (!balance) return "Unavailable";
  return walletMoney(balance.balance, currency);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
