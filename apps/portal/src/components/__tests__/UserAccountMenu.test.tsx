import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Settings } from "lucide-react";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { UserAccountMenu } from "../UserAccountMenu";

describe("UserAccountMenu", () => {
  it("renders account identity without opening menu content by default", () => {
    const markup = renderToStaticMarkup(
      <UserAccountMenu accountName="Ada Lovelace" accountEmail="ada@example.com" accountRole="Admin" />,
    );

    assert.match(markup, /Ada Lovelace/);
    assert.match(markup, /Admin/);
    assert.match(markup, /AL/);
    assert.match(markup, /aria-haspopup="menu"/);
    assert.match(markup, /aria-expanded="false"/);
    assert.doesNotMatch(markup, /ada@example.com/);
  });

  it("keeps behaviour callback-driven and avoids direct auth imports", () => {
    const source = readFileSync("apps/portal/src/components/UserAccountMenu/UserAccountMenu.tsx", "utf8");

    assert.match(source, /onSelect\?: \(\) => void/);
    assert.match(source, /onSignOut\?: \(\) => void/);
    assert.doesNotMatch(source, /next-auth/);
    assert.doesNotMatch(source, /signOut\(/);
  });

  it("defines accessible menu semantics for the opened account menu", () => {
    const source = readFileSync("apps/portal/src/components/UserAccountMenu/UserAccountMenu.tsx", "utf8");

    assert.match(source, /aria-haspopup="menu"/);
    assert.match(source, /role="menu"/);
    assert.match(source, /role="menuitem"/);
    assert.match(source, /event\.key === "Escape"/);
  });

  it("supports the image-style account dropdown variant with icon rows and a role pill", () => {
    const markup = renderToStaticMarkup(
      <UserAccountMenu
        accountName="webmaster@rollfinders.com"
        accountEmail="webmaster@rollfinders.com"
        accountRole="Super Admin"
        avatarLabel="WR"
        defaultOpen
        items={[{ href: "/dashboard/settings", icon: Settings, label: "Settings" }]}
        showRolePill
        variant="account-dropdown"
      />,
    );

    assert.match(markup, /WR/);
    assert.match(markup, /Super Admin/);
    assert.match(markup, /Settings/);
    assert.match(markup, /rounded-md bg-teal-100/);
    assert.match(markup, /absolute -top-\[1\.05rem\]/);
  });
});
