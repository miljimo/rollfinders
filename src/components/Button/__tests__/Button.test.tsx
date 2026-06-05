import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "../index";

describe("Button", () => {
  it("renders variant and size classes for native buttons", () => {
    const markup = renderToStaticMarkup(
      <Button size="md" variant="primary">
        Apply Filters
      </Button>,
    );

    assert.match(markup, /<button/);
    assert.match(markup, /type="button"/);
    assert.match(markup, /bg-teal-700/);
    assert.match(markup, /min-h-11/);
    assert.match(markup, /Apply Filters/);
  });

  it("renders compact destructive buttons", () => {
    const markup = renderToStaticMarkup(
      <Button size="sm" variant="danger">
        Delete
      </Button>,
    );

    assert.match(markup, /border-red-300/);
    assert.match(markup, /text-red-700/);
    assert.match(markup, /min-h-9/);
  });

  it("renders internal links with Next Link output", () => {
    const markup = renderToStaticMarkup(
      <Button href="/admin" variant="secondary">
        Dashboard
      </Button>,
    );

    assert.match(markup, /<a/);
    assert.match(markup, /href="\/admin"/);
    assert.match(markup, /border-stone-300/);
  });

  it("renders external anchors with safe rel for new tabs", () => {
    const markup = renderToStaticMarkup(
      <Button href="https://example.com" target="_blank" variant="secondary">
        External
      </Button>,
    );

    assert.match(markup, /href="https:\/\/example.com"/);
    assert.match(markup, /target="_blank"/);
    assert.match(markup, /rel="noreferrer"/);
  });

  it("renders disabled native buttons with disabled attribute", () => {
    const markup = renderToStaticMarkup(
      <Button disabled variant="neutral">
        Save
      </Button>,
    );

    assert.match(markup, /disabled=""/);
    assert.match(markup, /cursor-not-allowed/);
  });

  it("renders disabled links without href navigation", () => {
    const markup = renderToStaticMarkup(
      <Button disabled href="/admin/open-mats">
        Open Mats
      </Button>,
    );

    assert.match(markup, /role="link"/);
    assert.match(markup, /aria-disabled="true"/);
    assert.doesNotMatch(markup, /href="\/admin\/open-mats"/);
  });

  it("requires accessible labels for icon-only buttons", () => {
    assert.throws(() => renderToStaticMarkup(<Button size="icon" />), /Icon buttons must include an aria-label/);

    const markup = renderToStaticMarkup(
      <Button aria-label="Search" size="icon">
        <span aria-hidden="true">?</span>
      </Button>,
    );

    assert.match(markup, /aria-label="Search"/);
    assert.match(markup, /size-10/);
  });
});

