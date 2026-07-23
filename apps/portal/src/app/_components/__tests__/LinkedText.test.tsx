import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LinkedText } from "../LinkedText";

test("LinkedText renders safe URI schemes as links", () => {
  const markup = renderToStaticMarkup(<p><LinkedText text="Book at http://google.com or mailto:coach@example.com" /></p>);

  assert.match(markup, /href="http:\/\/google\.com"/);
  assert.match(markup, /href="mailto:coach@example\.com"/);
  assert.match(markup, /target="_blank"/);
  assert.match(markup, /rel="noopener noreferrer"/);
  assert.match(markup, /aria-label="http:\/\/google\.com opens in a new tab"/);
});

test("LinkedText leaves unsafe schemes as plain escaped text", () => {
  const markup = renderToStaticMarkup(<p><LinkedText text="Do not run javascript:alert(1)" /></p>);

  assert.doesNotMatch(markup, /href=/);
  assert.match(markup, /javascript:alert\(1\)/);
});
