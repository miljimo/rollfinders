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

    assert.match(markup, /grid grid-cols-1/);
    assert.match(markup, /sm:grid-cols-12/);
    assert.match(markup, /items-start/);
    assert.match(markup, /sm:grid-flow-dense/);
    assert.match(markup, /xl:col-span-4/);
    assert.doesNotMatch(markup, /auto-rows/);
    assert.doesNotMatch(markup, /row-span-/);
    assert.doesNotMatch(markup, /auto-fit/);
    assert.doesNotMatch(markup, /minmax\(min\(100%,22rem\),1fr\)/);
  });

  it("lets larger dashboard cards take more row space based on their content", () => {
    const markup = renderToStaticMarkup(
      <GridDashboard
        items={[
          { ...items[0], label: "Pricing Policies" },
          {
            ...items[1],
            description: "Create and manage courses, events, seminars, open mats, recurring schedules, and attendance workflows across the platform.",
            label: "Courses/Events",
          },
        ]}
      />,
    );

    assert.match(markup, /lg:col-span-4/);
    assert.match(markup, /lg:col-span-6/);
    assert.doesNotMatch(markup, /sm:w-fit/);
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

  it("keeps dashboard card headers on one line as part of the content width", () => {
    const markup = renderToStaticMarkup(<GridItemDashboard item={{ ...items[0], label: "Courses/Events" }} />);

    assert.match(markup, /grid-cols-\[auto_minmax\(0,1fr\)_auto\]/);
    assert.match(markup, /overflow-hidden/);
    assert.match(markup, /truncate/);
    assert.match(markup, /whitespace-nowrap/);
    assert.match(markup, /\[overflow-wrap:anywhere\]/);
    assert.doesNotMatch(markup, /min-h-52/);
    assert.doesNotMatch(markup, /sm:h-full/);
    assert.doesNotMatch(markup, /max-content/);
    assert.doesNotMatch(markup, /block[^"]*text-xl[^"]*\[overflow-wrap:anywhere\][^"]*sm:text-2xl/);
  });
});
