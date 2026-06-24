import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SidePanelControl, type SidePanelItem } from "../SidePanelControl";

const items: SidePanelItem[] = [
  { active: true, href: "/admin", icon: "dashboard", label: "Dashboard" },
  { href: "/admin?panel=settings", icon: "settings", label: "Settings" },
  { href: "/admin?panel=academy-claims", icon: "claims", label: "Academy Claims" },
  { href: "/admin?panel=maps", icon: "map", label: "Map" },
];

describe("SidePanelControl", () => {
  it("renders shared dashboard navigation with route and panel query targets intact", () => {
    const markup = renderToStaticMarkup(<SidePanelControl accountLabel="Ada Admin" navigationItems={items} roleLabel="Platform Admin" />);

    assert.match(markup, /aria-label="Dashboard navigation"/);
    assert.match(markup, /href="\/admin"/);
    assert.match(markup, /href="\/admin\?panel=settings"/);
    assert.match(markup, /href="\/admin\?panel=academy-claims"/);
    assert.match(markup, /href="\/admin\?panel=maps"/);
    assert.match(markup, /Ada Admin/);
    assert.match(markup, /Platform Admin/);
  });

  it("marks active navigation with aria-current and an accent class", () => {
    const markup = renderToStaticMarkup(<SidePanelControl navigationItems={items} />);

    assert.match(markup, /aria-current="page"/);
    assert.match(markup, /before:bg-teal-700/);
  });

  it("only renders navigation items supplied by the caller", () => {
    const markup = renderToStaticMarkup(
      <SidePanelControl navigationItems={[{ href: "/admin?panel=settings", icon: "settings", label: "Settings" }]} />,
    );

    assert.match(markup, /Settings/);
    assert.doesNotMatch(markup, /Academy Claims/);
    assert.doesNotMatch(markup, /Map/);
  });

  it("supports limited standard-user dashboard navigation", () => {
    const markup = renderToStaticMarkup(
      <SidePanelControl
        navigationItems={[
          { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
          { href: "/dashboard?panel=rolls", icon: "events", label: "Courses/Events" },
          { href: "/dashboard/members", icon: "users", label: "Members" },
          { href: "/dashboard/password", icon: "settings", label: "Password / Account Settings" },
        ]}
        roleLabel="Standard User"
      />,
    );

    assert.match(markup, /Standard User/);
    assert.match(markup, /Courses\/Events/);
    assert.match(markup, /Members/);
    assert.match(markup, /Password \/ Account Settings/);
    assert.doesNotMatch(markup, /Academy Claims/);
    assert.doesNotMatch(markup, /Platform Admin/);
  });

  it("renders accessible open, collapse, support, and logout controls", () => {
    const markup = renderToStaticMarkup(<SidePanelControl navigationItems={items} />);

    assert.match(markup, /aria-label="Open dashboard navigation"/);
    assert.match(markup, /aria-label="Collapse dashboard navigation"/);
    assert.match(markup, /Help &amp; Support/);
    assert.match(markup, /Logout/);
  });

  it("renders configured footer navigation with support controls", () => {
    const markup = renderToStaticMarkup(
      <SidePanelControl
        footerNavigationItems={[{ href: "/dashboard?panel=settings", icon: "settings", label: "Settings" }]}
        navigationItems={[{ href: "/dashboard/payment", icon: "payments", label: "Payments" }]}
      />,
    );

    assert.match(markup, /Payments/);
    assert.match(markup, /Settings/);
    assert.match(markup, /Help &amp; Support/);
    assert.match(markup, /Settings[\s\S]*Help &amp; Support[\s\S]*Logout/);
  });

  it("can render a complete mobile navigation list while keeping the desktop panel scoped", () => {
    const source = readFileSync("apps/portal/src/components/SidePanelControl/SidePanelControl.tsx", "utf8");

    assert.match(source, /mobileNavigationItems\?: SidePanelItem\[\]/);
    assert.match(source, /navigationItems=\{mobileNavigationItems \?\? navigationItems\}/);
    assert.match(source, /navigationItems=\{navigationItems\}/);
  });

  it("renders active nested navigation under the selected section", () => {
    const markup = renderToStaticMarkup(
      <SidePanelControl
        navigationItems={[
          {
            active: true,
            href: "/dashboard/payment",
            icon: "payments",
            label: "Payments",
            children: [
              { href: "/dashboard/payment?paymentsView=overview", label: "Overview" },
              { active: true, href: "/dashboard/payment?paymentsView=transactions", label: "Transactions" },
              { href: "/dashboard/payment?paymentsView=earnings", label: "Earnings" },
              { href: "/dashboard/payment?paymentsView=refunds", label: "Refunds" },
              { href: "/dashboard/payment?paymentsView=payouts", label: "Payouts" },
              { href: "/dashboard/payment?paymentsView=settings", label: "Payment Settings" },
            ],
          },
        ]}
      />,
    );

    assert.match(markup, /Payments/);
    assert.match(markup, /Overview/);
    assert.match(markup, /Transactions/);
    assert.match(markup, /Earnings/);
    assert.match(markup, /Refunds/);
    assert.match(markup, /Payouts/);
    assert.match(markup, /Payment Settings/);
    assert.match(markup, /aria-current="page"[\s\S]*href="\/dashboard\/payment\?paymentsView=transactions"/);
  });
});
