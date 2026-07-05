import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Pagination, paginationPages } from "../Pagination";

describe("Pagination", () => {
  it("renders numeric page links around the current page", () => {
    const markup = renderToStaticMarkup(
      <Pagination
        ariaLabel="Results pagination"
        currentPage={4}
        totalPages={8}
        getPageHref={(page) => `/items?page=${page}`}
      />,
    );

    assert.match(markup, /aria-label="Results pagination"/);
    assert.match(markup, /href="\/items\?page=3"/);
    assert.match(markup, /href="\/items\?page=4"/);
    assert.match(markup, /aria-current="page"/);
    assert.match(markup, />Previous</);
    assert.match(markup, />Next</);
  });

  it("disables unavailable previous and next controls", () => {
    const firstPage = renderToStaticMarkup(
      <Pagination ariaLabel="First page" currentPage={1} totalPages={3} getPageHref={(page) => `/items?page=${page}`} />,
    );
    const lastPage = renderToStaticMarkup(
      <Pagination ariaLabel="Last page" currentPage={3} totalPages={3} getPageHref={(page) => `/items?page=${page}`} />,
    );

    assert.match(firstPage, /disabled=""/);
    assert.doesNotMatch(firstPage, /href="\/items\?page=0"/);
    assert.match(lastPage, /disabled=""/);
    assert.doesNotMatch(lastPage, /href="\/items\?page=4"/);
  });

  it("supports summary-only controls for table pagination", () => {
    const markup = renderToStaticMarkup(
      <Pagination
        ariaLabel="Table pagination"
        currentPage={2}
        totalPages={5}
        previousHref="?page=1"
        nextHref="?page=3"
        showPageNumbers={false}
        showSummary
      />,
    );

    assert.match(markup, /Page 2 of 5/);
    assert.match(markup, /href="\?page=1"/);
    assert.match(markup, /href="\?page=3"/);
    assert.doesNotMatch(markup, /aria-current="page"/);
  });

  it("calculates a compact page range", () => {
    assert.deepEqual(paginationPages(4, 8), [2, 3, 4, 5, 6]);
    assert.deepEqual(paginationPages(1, 3), [1, 2, 3]);
  });
});
