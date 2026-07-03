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

  it("keeps sparse grid pages from stretching cards across the full row", () => {
    const markup = renderToStaticMarkup(<GridDashboard items={items} />);

    assert.match(markup, /grid-cols-\[repeat\(auto-fill,minmax\(min\(100%,22rem\),22rem\)\)\]/);
    assert.match(markup, /justify-start/);
    assert.doesNotMatch(markup, /auto-fit/);
    assert.doesNotMatch(markup, /minmax\(min\(100%,22rem\),1fr\)/);
  });

  it("paginates dashboard services when there are more items than the page size", () => {
    const manyItems = Array.from({ length: 13 }, (_, index) => ({
      description: `Service ${index + 1} description.`,
      href: `/dashboard/service-${index + 1}`,
      icon: "dashboard" as const,
      label: `Service ${index + 1}`,
    }));

    const markup = renderToStaticMarkup(<GridDashboard items={manyItems} itemsPerPage={3} />);

    assert.match(markup, /Showing 1-3 of 13 services/);
    assert.match(markup, /Page 1 of 5/);
    assert.match(markup, /Service 1/);
    assert.match(markup, /Service 3/);
    assert.doesNotMatch(markup, /Service 4 description/);
  });

  it("renders an individual dashboard item from GridDashboardItem props", () => {
    const markup = renderToStaticMarkup(<GridItemDashboard item={items[0]} className="md:col-span-6" />);

    assert.match(markup, /Academies/);
    assert.match(markup, /href="\/dashboard\/academies"/);
    assert.match(markup, /md:col-span-6/);
  });
});
