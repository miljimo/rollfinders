import { Plus } from "lucide-react";
import { Button } from "@/app/_components/Button";
import { Table } from "@/app/_components/Table";
import type { WalletPaginationMeta } from "@/lib/wallet-service";
import { walletColumns } from "./WalletDashboardColumns";
import type { WalletDashboardSearchParams, WalletRow } from "./walletDashboardTypes";
import { walletDetailsHref, walletPageHref } from "./walletDashboardUrls";

export function WalletsDashboard({ pagination, rows, searchParams }: { pagination: WalletPaginationMeta; rows: WalletRow[]; searchParams: WalletDashboardSearchParams }) {
  const page = Math.floor(pagination.offset / Math.max(1, pagination.limit)) + 1;
  const totalPages = Math.max(1, Math.ceil(pagination.total / Math.max(1, pagination.limit)));

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-stone-950">Wallets</h2>
        <Button href="/dashboard/wallet?walletDialog=create-wallet" variant="primary" className="min-h-10 px-4 shadow-sm">
          <Plus size={18} aria-hidden />
          Create Wallet
        </Button>
      </div>
      <Table
        columns={walletColumns}
        data={rows}
        emptyMessage="No wallets found."
        getRowDoubleClickHref={(row) => walletDetailsHref(searchParams, row.id)}
        getRowId={(row) => row.id}
        minWidthClassName="min-w-[760px]"
        pagination={{
          nextHref: pagination.has_more ? walletPageHref(searchParams, page + 1) : undefined,
          page,
          previousHref: page > 1 ? walletPageHref(searchParams, page - 1) : undefined,
          totalPages,
        }}
      />
    </section>
  );
}

