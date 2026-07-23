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

  it("renders clickable rows from a row href without merging row navigation into actions", () => {
    const markup = renderToStaticMarkup(
      <Table
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        getRowHref={(row) => `/open-mats/${row.id}`}
        actions={[
          { label: "Edit", href: (row) => `/admin/open-mats/${row.id}`, ariaLabel: (row) => `Edit ${row.title}` },
        ]}
      />,
    );

    assert.match(markup, /tabindex="0"/);
    assert.match(markup, /cursor-pointer/);
    assert.match(markup, /hover:bg-stone-50/);
    assert.match(markup, /href="\/admin\/open-mats\/open-mat-1"/);
    assert.match(markup, /Edit Friday Rounds/);
  });

  it("renders double-click row navigation without creating mobile links", () => {
    const markup = renderToStaticMarkup(
      <Table
        columns={columns}
        data={rows}
        getRowDoubleClickHref={(row) => `/wallets/${row.id}`}
        getRowId={(row) => row.id}
      />,
    );

    assert.match(markup, /tabindex="0"/);
    assert.match(markup, /Double click to view details/);
    assert.match(markup, /cursor-pointer/);
    assert.doesNotMatch(markup, /href="\/wallets\/open-mat-1"/);
  });

  it("renders a mobile card list using the same columns and actions", () => {
    const markup = renderToStaticMarkup(
      <Table
        title="Open Mats"
        columns={columns}
        data={rows}
        actions={[{ label: "Open", href: (row) => `/open-mats/${row.id}`, ariaLabel: (row) => `Open ${row.title}` }]}
        getRowId={(row) => row.id}
      />,
    );

    assert.match(markup, /md:hidden/);
    assert.match(markup, /md:block/);
    assert.match(markup, /<article/);
    assert.match(markup, /Title/);
    assert.match(markup, /Academy/);
    assert.match(markup, /Friday Rounds/);
    assert.match(markup, /href="\/open-mats\/open-mat-1"/);
  });

  it("renders pagination controls when pagination props are provided", () => {
    const markup = renderToStaticMarkup(
      <Table
        columns={columns}
        data={rows}
        pagination={{
          page: 2,
          totalPages: 3,
          previousHref: "/admin?panel=settings&emailView=attention",
          nextHref: "/admin?panel=settings&emailView=attention&emailPage=3",
        }}
      />,
    );

    assert.match(markup, /Page 2 of 3/);
    assert.match(markup, /href="\/admin\?panel=settings&amp;emailView=attention"/);
    assert.match(markup, /href="\/admin\?panel=settings&amp;emailView=attention&amp;emailPage=3"/);
  });
});
