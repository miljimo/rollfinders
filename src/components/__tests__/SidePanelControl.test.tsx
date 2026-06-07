import assert from "node:assert/strict";
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
  it("renders shared admin navigation with route and panel query targets intact", () => {
    const markup = renderToStaticMarkup(<SidePanelControl accountLabel="Ada Admin" navigationItems={items} roleLabel="Platform Admin" />);

    assert.match(markup, /aria-label="Admin navigation"/);
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

  it("only renders navigation items supplied by the admin page", () => {
    const markup = renderToStaticMarkup(
      <SidePanelControl navigationItems={[{ href: "/admin?panel=settings", icon: "settings", label: "Settings" }]} />,
    );

    assert.match(markup, /Settings/);
    assert.doesNotMatch(markup, /Academy Claims/);
    assert.doesNotMatch(markup, /Map/);
  });

  it("renders accessible open, collapse, support, and logout controls", () => {
    const markup = renderToStaticMarkup(<SidePanelControl navigationItems={items} />);

    assert.match(markup, /aria-label="Open admin navigation"/);
    assert.match(markup, /aria-label="Collapse admin navigation"/);
    assert.match(markup, /Help &amp; Support/);
    assert.match(markup, /Logout/);
  });
});
