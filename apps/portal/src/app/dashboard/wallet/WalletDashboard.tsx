import { TriangleAlert, Info, CheckCircle2, Plus } from "lucide-react";

import { Button } from "@/components/Button";
import { Table, TableStatusBadge, type TableColumn } from "@/components/Table";
import type { LinkedWalletAccount, WalletPaginationMeta, WalletRecord, WalletTransaction } from "@/lib/wallet-service";

type WalletDashboardSearchParams = Record<string, string | string[] | undefined>;
type WalletDashboardView = "dashboard" | "transactions";

type WalletRow = WalletRecord & {
  linkedAccount?: LinkedWalletAccount;
};

const transactionPageSize = 5;

const walletColumns: TableColumn<WalletRow>[] = [
  { key: "walletType", title: "Wallet Type", render: (_, row) => <span className="font-bold capitalize text-slate-950">{row.walletType}</span> },
  { key: "ownerId", title: "Owner ID", render: (_, row) => <span className="break-all font-mono text-xs text-slate-700">{row.ownerId}</span> },
  { key: "currency", title: "Currency", render: (_, row) => <span className="font-bold">{row.currency}</span> },
  { key: "linkedAccount", title: "Linked Account", render: (_, row) => <LinkedAccountSummary account={row.linkedAccount} walletType={row.walletType} /> },
  { key: "providerAccountId", title: "Provider Account", render: (_, row) => <ProviderAccount account={row.linkedAccount} /> },
  { key: "status", title: "Status", render: (_, row) => <TableStatusBadge status={row.status} /> },
];

const transactionColumns: TableColumn<WalletTransaction>[] = [
  { key: "createdAt", title: "Created", render: (_, row) => formatDateTime(row.createdAt) },
  { key: "type", title: "Type", render: (_, row) => <span className="font-bold capitalize text-slate-950">{row.type.replaceAll("_", " ")}</span> },
  { key: "amount", title: "Amount", render: (_, row) => money(row.amount, row.currency) },
  { key: "status", title: "Status", render: (_, row) => <TableStatusBadge status={row.status} /> },
  { key: "sourceWalletId", title: "Source Wallet", render: (_, row) => <WalletId value={row.sourceWalletId} /> },
  { key: "destinationWalletId", title: "Destination Wallet", render: (_, row) => <WalletId value={row.destinationWalletId} /> },
  { key: "referenceId", title: "Reference", render: (_, row) => row.referenceId ? <span className="break-all font-mono text-xs text-slate-700">{row.referenceId}</span> : "None" },
];

export function WalletDashboard({
  error,
  linkedAccounts,
  pagination,
  searchParams,
  transactions,
  view = "dashboard",
  wallets,
}: {
  error?: string;
  linkedAccounts: LinkedWalletAccount[];
  pagination: WalletPaginationMeta;
  searchParams: WalletDashboardSearchParams;
  transactions: WalletTransaction[];
  view?: WalletDashboardView;
  wallets: WalletRecord[];
}) {
  const rows = wallets.map((wallet) => {
    return {
      ...wallet,
      linkedAccount: linkedAccounts.find((account) => account.walletId === wallet.id),
    };
  });
  const page = Math.floor(pagination.offset / Math.max(1, pagination.limit)) + 1;
  const totalPages = Math.max(1, Math.ceil(pagination.total / Math.max(1, pagination.limit)));

  return (
    <div className="grid gap-5">
      {error ? <WalletMessage message={error} tone="warning" /> : null}

      {view === "transactions" ? (
        <WalletTransactionsDashboard searchParams={searchParams} transactions={transactions} />
      ) : (
        <Table
          title="Wallets"
          columns={walletColumns}
          data={rows}
          emptyMessage="No wallets found."
          getRowId={(row) => row.id}
          minWidthClassName="min-w-[900px]"
          pagination={{
            nextHref: pagination.has_more ? walletPageHref(searchParams, page + 1, pagination.limit) : undefined,
            page,
            previousHref: page > 1 ? walletPageHref(searchParams, page - 1, pagination.limit) : undefined,
            totalPages,
          }}
        />
      )}
    </div>
  );
}

function WalletTransactionsDashboard({
  searchParams,
  transactions,
}: {
  searchParams: WalletDashboardSearchParams;
  transactions: WalletTransaction[];
}) {
  const page = pageFromSearchParams(searchParams, "transactionPage");
  const totalPages = Math.max(1, Math.ceil(transactions.length / transactionPageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * transactionPageSize;
  const paginatedTransactions = transactions.slice(start, start + transactionPageSize);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-stone-950">Transactions</h2>
        <Button href="/dashboard/wallet?walletView=transactions&walletDialog=create-transaction" variant="primary" className="min-h-10 px-4 shadow-sm">
          <Plus size={18} aria-hidden />
          Create
        </Button>
      </div>
      <Table
        columns={transactionColumns}
        data={paginatedTransactions}
        emptyMessage="No wallet transactions found."
        getRowId={(row, rowIndex) => `${row.id}-${start + rowIndex}`}
        minWidthClassName="min-w-[980px]"
        pagination={{
          nextHref: currentPage < totalPages ? transactionPageHref(searchParams, currentPage + 1) : undefined,
          page: currentPage,
          previousHref: currentPage > 1 ? transactionPageHref(searchParams, currentPage - 1) : undefined,
          totalPages,
        }}
      />
    </section>
  );
}

function WalletId({ value }: { value?: string }) {
  if (!value) return <span className="text-slate-500">None</span>;
  return <span className="break-all font-mono text-xs text-slate-700">{value}</span>;
}

function LinkedAccountSummary({ account, walletType }: { account?: LinkedWalletAccount; walletType: string }) {
  if (walletType !== "external") return <span className="text-slate-500">Internal</span>;
  if (!account) return <span className="font-semibold text-amber-700">Not linked</span>;
  return (
    <span className="grid gap-1">
      <span className="font-bold text-slate-950">{account.displayName || account.provider}</span>
      <span className="text-xs font-semibold text-slate-500">{account.connectionType}</span>
    </span>
  );
}

function ProviderAccount({ account }: { account?: LinkedWalletAccount }) {
  if (!account) return <span className="text-slate-500">None</span>;
  return (
    <span className="grid gap-1">
      <span className="font-bold text-slate-950">{account.provider}</span>
      {account.providerAccountId ? <span className="break-all font-mono text-xs text-slate-700">{account.providerAccountId}</span> : null}
      <TableStatusBadge status={account.status} />
    </span>
  );
}

function WalletMessage({
  className = "",
  message,
  tone,
}: {
  className?: string;
  message: string;
  tone: "error" | "success" | "warning";
}) {
  const toneClassName = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-teal-200 bg-teal-50 text-teal-900",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? Info : TriangleAlert;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-4 text-sm font-bold ${toneClassName} ${className}`}>
      <Icon className="size-5 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

function walletPageHref(searchParams: WalletDashboardSearchParams, page: number, _pageSize: number) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value || key === "walletPage" || key === "walletResult" || key === "walletError" || key === "walletDialog") return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }
    params.set(key, value);
  });
  if (page > 1) params.set("walletPage", String(page));
  const query = params.toString();
  return query ? `/dashboard/wallet?${query}` : "/dashboard/wallet";
}

function transactionPageHref(searchParams: WalletDashboardSearchParams, page: number) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value || key === "transactionPage" || key === "walletResult" || key === "walletError" || key === "walletDialog") return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }
    params.set(key, value);
  });
  params.set("walletView", "transactions");
  if (page > 1) params.set("transactionPage", String(page));
  const query = params.toString();
  return query ? `/dashboard/wallet?${query}` : "/dashboard/wallet?walletView=transactions";
}

function pageFromSearchParams(searchParams: WalletDashboardSearchParams, key: string) {
  const value = searchParams[key];
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { currency, style: "currency" }).format(amountMinor / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
