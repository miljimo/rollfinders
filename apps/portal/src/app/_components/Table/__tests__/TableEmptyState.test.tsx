import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Table, TableEmptyState, TableLoadingState } from "../index";

describe("TableEmptyState", () => {
  it("renders the default empty message", () => {
    const markup = renderToStaticMarkup(<TableEmptyState />);

    assert.match(markup, /No records found\./);
  });

  it("renders an empty state instead of table markup", () => {
    const markup = renderToStaticMarkup(<Table title="Users" columns={[{ key: "name", title: "Name" }]} data={[]} />);

    assert.match(markup, /Users/);
    assert.match(markup, /No records found\./);
    assert.doesNotMatch(markup, /<table/);
  });

  it("renders a loading state instead of table markup", () => {
    const markup = renderToStaticMarkup(
      <TableLoadingState message="Loading users..." />,
    );

    assert.match(markup, /Loading users\.\.\./);
    assert.doesNotMatch(markup, /<table/);
  });
});
