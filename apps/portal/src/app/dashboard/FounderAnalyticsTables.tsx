"use client";

import { Table, TableStatusBadge, type TableRecord } from "@/app/_components/Table";
import type { AnalyticsDailyVisit } from "@/lib/analytics/types";

type FounderAnalyticsRow = TableRecord & {
  id: string;
  area: string;
  metric: string;
  value: string;
};

export function FounderAnalyticsTables({
  dailyVisits,
  rows,
}: {
  dailyVisits: AnalyticsDailyVisit[];
  rows: FounderAnalyticsRow[];
}) {
  return (
    <>
      <Table
        className="mt-5"
        columns={[
          {
            key: "area",
            title: "Analytics Area",
            render: (value) => (
              <span className="font-bold text-slate-950">{String(value)}</span>
            ),
          },
          { key: "metric", title: "Tracked Metrics" },
          {
            key: "value",
            title: "Current Signal",
            render: (value) => <TableStatusBadge status={String(value)} />,
          },
        ]}
        data={rows}
        emptyMessage="Analytics metrics will appear here once events are available."
        getRowId={(row) => String(row.id)}
        minWidthClassName="min-w-[760px]"
      />

      <div className="mt-5">
        <h3 className="text-base font-black text-slate-950">Daily Visits</h3>
        <Table
          className="mt-3"
          columns={[
            {
              key: "date",
              title: "Date",
              render: (value) => (
                <span className="font-bold text-slate-950">
                  {String(value)}
                </span>
              ),
            },
            {
              key: "uniqueVisitors",
              title: "Unique Visitors",
              render: (value) => Number(value).toLocaleString(),
            },
            {
              key: "uniqueSessions",
              title: "Unique Sessions",
              render: (value) => Number(value).toLocaleString(),
            },
            {
              key: "eventCount",
              title: "Event Count",
              render: (value) => Number(value).toLocaleString(),
            },
          ]}
          data={dailyVisits}
          emptyMessage="Daily visits will appear here once analytics events are available."
          getRowId={(row) => String(row.date)}
          minWidthClassName="min-w-[760px]"
        />
      </div>
    </>
  );
}
