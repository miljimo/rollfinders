import { BookOpen, LockKeyhole, Wallet, TriangleAlert, Info, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Table, TableStatusBadge, type TableColumn } from "@/components/Table";
import type { WalletBalance, WalletPaginationMeta, WalletRecord, WalletTransaction } from "@/lib/wallet-service";

type WalletDashboardSearchParams = Record<string, string | string[] | undefined>;

type WalletRow = WalletRecord & {
  availableBalance?: number;
  reservedBalance?: number;
  ledgerBalance?: number;
};

const walletColumns: TableColumn<WalletRow>[] = [
  { key: "ownerType", title: "Owner Type", render: (_, row) => <span className="font-bold capitalize text-slate-950">{row.ownerType}</span> },
  { key: "ownerId", title: "Owner ID", render: (_, row) => <span className="break-all font-mono text-xs text-slate-700">{row.ownerId}</span> },
  { key: "currency", title: "Currency", render: (_, row) => <span className="font-bold">{row.currency}</span> },
  { key: "availableBalance", title: "Available Balance", render: (_, row) => money(row.availableBalance ?? 0, row.currency) },
  { key: "reservedBalance", title: "Reserved Balance", render: (_, row) => money(row.reservedBalance ?? 0, row.currency) },
  { key: "ledgerBalance", title: "Ledger Balance", render: (_, row) => money(row.ledgerBalance ?? 0, row.currency) },
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
  balances,
  error,
  pagination,
  searchParams,
  transactions,
  wallets,
}: {
  balances: WalletBalance[];
  error?: string;
  pagination: WalletPaginationMeta;
  searchParams: WalletDashboardSearchParams;
  transactions: WalletTransaction[];
  wallets: WalletRecord[];
}) {
  const rows = wallets.map((wallet) => {
    const balance = balances.find((item) => item.walletId === wallet.id);
    return {
      ...wallet,
      availableBalance: balance?.availableBalance,
      ledgerBalance: balance?.ledgerBalance,
      reservedBalance: balance?.reservedBalance,
    };
  });
  const page = Math.floor(pagination.offset / Math.max(1, pagination.limit)) + 1;
  const totalPages = Math.max(1, Math.ceil(pagination.total / Math.max(1, pagination.limit)));
  const summary = rows.reduce(
    (acc, wallet) => {
      acc.available += wallet.availableBalance ?? 0;
      acc.reserved += wallet.reservedBalance ?? 0;
      acc.ledger += wallet.ledgerBalance ?? 0;
      return acc;
    },
    { available: 0, ledger: 0, reserved: 0 },
  );

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 xl:grid-cols-3">
        <WalletMetric
          detail="Funds available to use"
          icon={Wallet}
          label="Available Balance"
          tone="teal"
          value={money(summary.available, "GBP")}
        />
        <WalletMetric
          detail="Funds reserved for holds"
          icon={LockKeyhole}
          label="Reserved Balance"
          tone="amber"
          value={money(summary.reserved, "GBP")}
        />
        <WalletMetric
          detail="Total ledger balance"
          icon={BookOpen}
          label="Ledger Balance"
          tone="blue"
          value={money(summary.ledger, "GBP")}
        />
      </section>

      {error ? <WalletMessage message={error} tone="warning" /> : null}

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

      <WalletTransactionsDashboard transactions={transactions} />
    </div>
  );
}

function WalletTransactionsDashboard({ transactions }: { transactions: WalletTransaction[] }) {
  return (
    <Table
      title="Transactions"
      columns={transactionColumns}
      data={transactions.slice(0, 10)}
      emptyMessage="No wallet transactions found."
      getRowId={(row) => row.id}
      minWidthClassName="min-w-[980px]"
    />
  );
}

function WalletId({ value }: { value?: string }) {
  if (!value) return <span className="text-slate-500">None</span>;
  return <span className="break-all font-mono text-xs text-slate-700">{value}</span>;
}

function WalletMetric({
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: "amber" | "blue" | "teal";
  value: string;
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50/40 text-amber-800 icon:bg-amber-100",
    blue: "border-blue-200 bg-blue-50/40 text-blue-800 icon:bg-blue-100",
    teal: "border-teal-200 bg-teal-50/50 text-teal-800 icon:bg-teal-100",
  };
  const [cardTone, iconTone] = tones[tone].split(" icon:");

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${cardTone}`}>
      <div className="flex items-center gap-5">
        <span className={`grid size-14 shrink-0 place-items-center rounded-full ${iconTone}`}>
          <Icon size={26} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-700">{label}</p>
          <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">{detail}</p>
        </div>
      </div>
    </div>
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

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { currency, style: "currency" }).format(amountMinor / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
