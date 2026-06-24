import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Building2, CalendarDays, Users } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuickActionPanel, type QuickActionPanelItem } from "../index";

const actions: QuickActionPanelItem[] = [
  {
    description: "Search, verify and manage academies",
    href: "/admin?panel=academies",
    icon: <Building2 size={24} aria-hidden />,
    id: "academies",
    title: "Manage Academies",
  },
  {
    active: true,
    description: "Create, edit and manage events",
    href: "/admin?panel=open-mats",
    icon: <CalendarDays size={24} aria-hidden />,
    id: "open-mats",
    title: "Manage Open Mats",
  },
  {
    description: "Create, edit and manage users",
    href: "/admin?panel=users",
    icon: <Users size={24} aria-hidden />,
    id: "users",
    title: "Manage Users",
  },
];

describe("QuickActionPanel", () => {
  it("renders the heading and action links in a compact wrapping layout", () => {
    const markup = renderToStaticMarkup(<QuickActionPanel items={actions} />);

    assert.match(markup, /<h2/);
    assert.match(markup, /Quick Actions/);
    assert.match(markup, /mt-4 flex flex-wrap gap-4/);
    assert.match(markup, /href="\/admin\?panel=academies"/);
    assert.match(markup, /Manage Academies/);
    assert.match(markup, /sm:w-fit/);
    assert.match(markup, /sm:max-w-\[34rem\]/);
  });

  it("limits rendered items without placeholders", () => {
    const markup = renderToStaticMarkup(<QuickActionPanel items={actions} maxItems={2} />);

    assert.match(markup, /Manage Academies/);
    assert.match(markup, /Manage Open Mats/);
    assert.doesNotMatch(markup, /Manage Users/);
  });

  it("marks active actions with page state and visible treatment", () => {
    const markup = renderToStaticMarkup(<QuickActionPanel items={actions} />);

    assert.match(markup, /aria-current="page"/);
    assert.match(markup, /border-teal-500 ring-1 ring-teal-500/);
  });

  it("renders nothing by default when there are no actions", () => {
    const markup = renderToStaticMarkup(<QuickActionPanel items={[]} />);

    assert.equal(markup, "");
  });

  it("renders a configured empty state", () => {
    const markup = renderToStaticMarkup(
      <QuickActionPanel emptyState="No actions available" headingLevel={3} items={[]} title="Shortcuts" />,
    );

    assert.match(markup, /<h3/);
    assert.match(markup, /Shortcuts/);
    assert.match(markup, /No actions available/);
  });

  it("renders the configured empty message behavior", () => {
    const markup = renderToStaticMarkup(<QuickActionPanel emptyBehavior="message" emptyMessage="No actions for this role." items={[]} />);

    assert.match(markup, /No actions for this role/);
  });

  it("keeps disabled actions visible without navigation", () => {
    const markup = renderToStaticMarkup(
      <QuickActionPanel
        items={[
          {
            ...actions[0],
            disabled: true,
          },
        ]}
      />,
    );

    assert.match(markup, /role="link"/);
    assert.match(markup, /aria-disabled="true"/);
    assert.doesNotMatch(markup, /href="\/admin\?panel=academies"/);
    assert.match(markup, /cursor-not-allowed/);
  });

  it("renders collapsible panels collapsed by default without action cards", () => {
    const markup = renderToStaticMarkup(<QuickActionPanel collapsible defaultCollapsed items={actions} />);

    assert.match(markup, /Quick Actions/);
    assert.match(markup, /aria-expanded="false"/);
    assert.match(markup, /aria-label="Expand Quick Actions"/);
    assert.doesNotMatch(markup, /href="\/admin\?panel=academies"/);
    assert.doesNotMatch(markup, /mt-4 flex flex-wrap gap-4/);
  });

  it("renders collapsible panels expanded when defaultCollapsed is false", () => {
    const markup = renderToStaticMarkup(<QuickActionPanel collapsible items={actions} />);

    assert.match(markup, /aria-expanded="true"/);
    assert.match(markup, /aria-label="Collapse Quick Actions"/);
    assert.match(markup, /href="\/admin\?panel=academies"/);
  });
});
