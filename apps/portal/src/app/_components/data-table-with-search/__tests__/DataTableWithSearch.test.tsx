import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DataTableWithSearch } from "../index";
import type { TableColumn, TableRecord } from "@/app/_components/Table";

type Row = {
  id: string;
  name: string;
  status: string;
} & TableRecord;

const columns: TableColumn<Row>[] = [
  { key: "name", title: "Name" },
  { key: "status", title: "Status" },
];

const rows: Row[] = [
  { id: "row_1", name: "Starter", status: "ACTIVE" },
];

describe("DataTableWithSearch", () => {
  it("renders configured search, header actions, and table content", () => {
    const markup = renderToStaticMarkup(
      <DataTableWithSearch
        title="Plans"
        description="Manage subscription plans."
        search={{
          action: "/dashboard/subscriptions",
          name: "plansSearch",
          value: "starter",
          placeholder: "Search plans",
          hiddenFields: {
            subscriptionsView: "plans",
            plansPage: 0,
            ignored: "",
          },
        }}
        headerActions={<a href="/dashboard/subscriptions?dialog=new-plan">New Plan</a>}
        columns={columns}
        data={rows}
        getRowHref={() => undefined}
        pagination={{ page: 1, totalPages: 2, previousHref: "/previous", nextHref: "/next" }}
      />,
    );

    assert.match(markup, /Plans/);
    assert.match(markup, /Manage subscription plans\./);
    assert.match(markup, /action="\/dashboard\/subscriptions"/);
    assert.match(markup, /name="plansSearch"/);
    assert.match(markup, /value="starter"/);
    assert.match(markup, /placeholder="Search plans"/);
    assert.match(markup, /name="subscriptionsView"/);
    assert.match(markup, /value="plans"/);
    assert.doesNotMatch(markup, /name="plansPage"/);
    assert.doesNotMatch(markup, /name="ignored"/);
    assert.match(markup, /New Plan/);
    assert.match(markup, /Starter/);
    assert.match(markup, /ACTIVE/);
    assert.match(markup, /Next/);
  });

  it("omits the search form when search is not configured", () => {
    const markup = renderToStaticMarkup(<DataTableWithSearch columns={columns} data={rows} />);

    assert.doesNotMatch(markup, /<form/);
    assert.match(markup, /Starter/);
  });

  it("renders filters in the controls area", () => {
    const markup = renderToStaticMarkup(
      <DataTableWithSearch columns={columns} data={rows} filters={<select aria-label="Status"><option>Active</option></select>} />,
    );

    assert.match(markup, /aria-label="Status"/);
    assert.match(markup, /Active/);
  });
});
