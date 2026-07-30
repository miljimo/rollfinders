"use client";

import { Table, type TableColumn, type TableRecord } from "@/app/_components/Table";

export type StandardDashboardRollRow = TableRecord & {
  id: string;
  title: string;
  date: string;
  time: string;
  giType: string;
  price: string;
  href: string;
};

const columns: TableColumn<StandardDashboardRollRow>[] = [
  {
    key: "title",
    title: "Roll",
    render: (value) => <span className="font-black text-slate-950">{String(value)}</span>,
  },
  { key: "date", title: "Date" },
  { key: "time", title: "Time" },
  { key: "giType", title: "Format" },
  { key: "price", title: "Price" },
];

export function StandardDashboardRollsTable({
  emptyMessage,
  nextHref,
  page,
  previousHref,
  rows,
  totalPages,
}: {
  emptyMessage: string;
  nextHref: string;
  page: number;
  previousHref: string;
  rows: StandardDashboardRollRow[];
  totalPages: number;
}) {
  return (
    <Table
      title="Courses/Events"
      columns={columns}
      data={rows}
      emptyMessage={emptyMessage}
      getRowHref={(row) => row.href}
      getRowId={(row) => row.id}
      pagination={{ page, totalPages, previousHref, nextHref }}
    />
  );
}
