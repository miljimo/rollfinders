import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TabControl } from "../TabControl";

describe("TabControl", () => {
  it("renders accessible link tabs with the active tab selected", () => {
    const markup = renderToStaticMarkup(
      <TabControl
        activeValue="plans"
        ariaLabel="Billing details"
        items={[
          { value: "transaction", label: "Transaction", href: "?tab=transaction" },
          { value: "plans", label: "Plans", href: "?tab=plans" },
          { value: "invoice", label: "Invoice", href: "?tab=invoice" },
        ]}
      />,
    );

    assert.match(markup, /role="tablist"/);
    assert.match(markup, /aria-label="Billing details"/);
    assert.match(markup, /href="\?tab=transaction"/);
    assert.match(markup, /href="\?tab=plans"/);
    assert.match(markup, /aria-selected="true"/);
    assert.match(markup, />Plans</);
  });

  it("renders disabled tabs without hrefs", () => {
    const markup = renderToStaticMarkup(
      <TabControl
        activeValue="transaction"
        ariaLabel="Billing details"
        items={[
          { value: "transaction", label: "Transaction", href: "?tab=transaction" },
          { value: "invoice", label: "Invoice", href: "?tab=invoice", disabled: true },
        ]}
      />,
    );

    assert.match(markup, /aria-disabled="true"/);
    assert.doesNotMatch(markup, /href="\?tab=invoice"/);
  });
});
