import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StatIndicator } from "../StatIndicator";

describe("StatIndicator", () => {
  it("renders factual period counts without a direction icon by default", () => {
    const markup = renderToStaticMarkup(<StatIndicator value={8} label="this month" />);

    assert.match(markup, /8 this month/);
    assert.match(markup, /aria-label="8 this month"/);
    assert.match(markup, /text-slate-600/);
    assert.doesNotMatch(markup, /<svg/);
  });

  it("renders directional states only when requested", () => {
    const markup = renderToStaticMarkup(
      <StatIndicator
        ariaLabel="4 more than last week"
        direction="up"
        label="vs last week"
        tone="positive"
        value="+4"
      />,
    );

    assert.match(markup, /<svg/);
    assert.match(markup, /text-teal-700/);
    assert.match(markup, /aria-label="4 more than last week"/);
    assert.match(markup, /\+4 vs last week/);
  });

  it("supports warning and label-only states", () => {
    const markup = renderToStaticMarkup(<StatIndicator label="Needs attention" tone="warning" />);

    assert.match(markup, /Needs attention/);
    assert.match(markup, /text-amber-700/);
    assert.doesNotMatch(markup, /<svg/);
  });
});
