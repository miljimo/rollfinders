import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TablePagination } from "../index";

describe("TablePagination", () => {
  it("renders page count and controls", () => {
    const markup = renderToStaticMarkup(<TablePagination page={2} totalPages={5} previousHref="?page=1" nextHref="?page=3" />);

    assert.match(markup, /Page 2 of 5/);
    assert.match(markup, /Previous/);
    assert.match(markup, /Next/);
    assert.match(markup, /href="\?page=1"/);
    assert.match(markup, /href="\?page=3"/);
  });

  it("disables unavailable controls", () => {
    const firstPage = renderToStaticMarkup(<TablePagination page={1} totalPages={3} previousHref="?page=0" nextHref="?page=2" />);
    const lastPage = renderToStaticMarkup(<TablePagination page={3} totalPages={3} previousHref="?page=2" nextHref="?page=4" />);

    assert.match(firstPage, /disabled=""/);
    assert.doesNotMatch(firstPage, /href="\?page=0"/);
    assert.match(lastPage, /disabled=""/);
    assert.doesNotMatch(lastPage, /href="\?page=4"/);
  });
});
