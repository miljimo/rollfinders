import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { GridDashboard, GridItemDashboard, type GridDashboardItem } from "../index";

const items: GridDashboardItem[] = [
  {
    description: "Manage academy records.",
    href: "/dashboard/academies",
    icon: "academies",
    label: "Academies",
  },
  {
    description: "Review payment state.",
    href: "/dashboard/payment",
    icon: "payments",
    label: "Payments",
  },
];

describe("GridDashboard", () => {
  it("renders a searchable grid of dashboard services", () => {
    const markup = renderToStaticMarkup(<GridDashboard items={items} />);

    assert.match(markup, /Search app services/);
    assert.match(markup, /Academies/);
    assert.match(markup, /Manage academy records/);
    assert.match(markup, /href="\/dashboard\/academies"/);
    assert.match(markup, /Payments/);
  });

  it("renders an individual dashboard item from GridDashboardItem props", () => {
    const markup = renderToStaticMarkup(<GridItemDashboard item={items[0]} className="md:col-span-6" />);

    assert.match(markup, /Academies/);
    assert.match(markup, /href="\/dashboard\/academies"/);
    assert.match(markup, /md:col-span-6/);
  });
});
