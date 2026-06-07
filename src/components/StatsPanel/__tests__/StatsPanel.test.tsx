import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CalendarDays, Users } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatsPanel, type StatsPanelItem } from "../index";

const items: StatsPanelItem[] = [
  {
    id: "users",
    label: "Academy Users",
    value: 1280,
    icon: <Users size={24} aria-hidden />,
    iconTone: "blue",
    indicator: { label: "new this month", value: 8 },
  },
  {
    id: "rolls",
    label: "Academy Rolls",
    value: 24,
    icon: <CalendarDays size={24} aria-hidden />,
    iconTone: "violet",
    indicator: { label: "created this week", value: 3 },
  },
];

describe("StatsPanel", () => {
  it("renders supplied stat items with localized values and indicators", () => {
    const markup = renderToStaticMarkup(<StatsPanel items={items} />);

    assert.match(markup, /Academy Users/);
    assert.match(markup, /1,280/);
    assert.match(markup, /8 new this month/);
    assert.match(markup, /Academy Rolls/);
  });

  it("limits rendered stat items with maxItems", () => {
    const markup = renderToStaticMarkup(<StatsPanel items={items} maxItems={1} />);

    assert.match(markup, /Academy Users/);
    assert.doesNotMatch(markup, /Academy Rolls/);
  });

  it("hides itself by default when there are no items", () => {
    const markup = renderToStaticMarkup(<StatsPanel items={[]} />);

    assert.equal(markup, "");
  });

  it("renders an empty message when requested", () => {
    const markup = renderToStaticMarkup(<StatsPanel items={[]} emptyBehavior="message" emptyMessage="No metrics available." />);

    assert.match(markup, /No metrics available/);
  });

  it("renders linked stat items only when href is supplied and enabled", () => {
    const markup = renderToStaticMarkup(<StatsPanel items={[{ ...items[0], href: "/admin?panel=users" }]} />);

    assert.match(markup, /href="\/admin\?panel=users"/);
  });

  it("keeps disabled linked stat items visible without navigation", () => {
    const markup = renderToStaticMarkup(<StatsPanel items={[{ ...items[0], disabled: true, href: "/admin?panel=users" }]} />);

    assert.match(markup, /aria-disabled="true"/);
    assert.doesNotMatch(markup, /href="\/admin\?panel=users"/);
  });
});
