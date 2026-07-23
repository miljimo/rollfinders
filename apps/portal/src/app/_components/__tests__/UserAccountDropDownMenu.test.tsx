import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { UserAccountDropDownMenu } from "../UserAccountDropDownMenu";

describe("UserAccountDropDownMenu", () => {
  it("reuses UserAccountMenu for the image-style account dropdown", () => {
    const source = readFileSync("apps/portal/src/app/_components/UserAccountDropDownMenu/UserAccountDropDownMenu.tsx", "utf8");

    assert.match(source, /UserAccountMenu/);
    assert.match(source, /variant="account-dropdown"/);
    assert.match(source, /showRolePill/);
    assert.doesNotMatch(source, /next-auth/);
  });

  it("renders the opened menu with image-matched account details and rows", () => {
    const markup = renderToStaticMarkup(
      <UserAccountDropDownMenu
        accountName="webmaster@rollfinders.com"
        accountEmail="webmaster@rollfinders.com"
        accountRole="Super Admin"
        avatarLabel="WR"
        defaultOpen
        onSignOut={() => undefined}
      />,
    );

    assert.match(markup, /WR/);
    assert.match(markup, /webmaster@rollfinders\.com/);
    assert.match(markup, /Super Admin/);
    assert.match(markup, /Profile/);
    assert.match(markup, /Settings/);
    assert.match(markup, /Help &amp; Support/);
    assert.match(markup, /Logout/);
    assert.match(markup, /aria-expanded="true"/);
    assert.match(markup, /w-\[min\(38rem,calc\(100vw-2rem\)\)\]/);
  });

  it("uses configurable account action links", () => {
    const markup = renderToStaticMarkup(
      <UserAccountDropDownMenu
        accountName="webmaster@rollfinders.com"
        defaultOpen
        helpHref="/support"
        profileHref="/me"
        settingsHref="/settings"
      />,
    );

    assert.match(markup, /href="\/me"/);
    assert.match(markup, /href="\/settings"/);
    assert.match(markup, /href="\/support"/);
  });
});
