import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Table, TableStatusBadge, type TableColumn } from "../index";

type OpenMatRow = {
  id: string;
  title: string;
  academy: string;
  status: string;
};

const rows: OpenMatRow[] = [
  { id: "open-mat-1", title: "Friday Rounds", academy: "North London BJJ", status: "Active" },
  { id: "open-mat-2", title: "Sunday Sparring", academy: "Southside Grappling", status: "Pending" },
];

const columns: TableColumn<OpenMatRow>[] = [
  { key: "title", title: "Title" },
  { key: "academy", title: "Academy" },
  {
    key: "status",
    title: "Status",
    render: (value) => <TableStatusBadge status={String(value)} />,
  },
];

describe("Table", () => {
  it("renders a dynamic title, columns, and rows", () => {
    const markup = renderToStaticMarkup(<Table title="Open Mats" columns={columns} data={rows} getRowId={(row) => row.id} />);

    assert.match(markup, /Open Mats/);
    assert.match(markup, /Title/);
    assert.match(markup, /Academy/);
    assert.match(markup, /Friday Rounds/);
    assert.match(markup, /Southside Grappling/);
  });

  it("uses custom render functions", () => {
    const markup = renderToStaticMarkup(<Table columns={columns} data={rows} />);

    assert.match(markup, /Active/);
    assert.match(markup, /bg-teal-50/);
    assert.match(markup, /Pending/);
    assert.match(markup, /bg-amber-50/);
  });

  it("renders configurable row actions", () => {
    const markup = renderToStaticMarkup(
      <Table
        columns={columns}
        data={rows}
        actions={[
          { label: "Open", href: (row) => `/open-mats/${row.id}`, ariaLabel: (row) => `Open ${row.title}` },
          { label: "Archive", onClick: () => undefined },
        ]}
      />,
    );

    assert.match(markup, /Actions/);
    assert.match(markup, /Open Friday Rounds/);
    assert.match(markup, /href="\/open-mats\/open-mat-1"/);
    assert.match(markup, /Archive/);
  });
});
