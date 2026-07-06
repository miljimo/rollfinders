import { Plus } from "lucide-react";
import { Button } from "@/components/Button";
import { Table } from "@/components/Table";
import type { WalletTransaction } from "@/lib/wallet-service";
import { transactionColumns } from "./WalletDashboardColumns";
import type { WalletDashboardSearchParams } from "./walletDashboardTypes";
import { pageFromSearchParams, transactionDetailsHref, transactionPageHref } from "./walletDashboardUrls";

const transactionPageSize = 5;

export function WalletTransactionsDashboard({ searchParams, transactions }: { searchParams: WalletDashboardSearchParams; transactions: WalletTransaction[] }) {
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
        getRowHref={(row) => transactionDetailsHref(searchParams, row.id)}
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

