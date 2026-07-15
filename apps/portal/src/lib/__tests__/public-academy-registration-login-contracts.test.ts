import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSource(path: string) {
  assert.equal(existsSync(path), true, `${path} must exist`);
  return readFileSync(path, "utf8");
}

describe("public academy registration login contracts", () => {
  it("keeps credential login behavior intact while adding registration choices", () => {
    const loginFormSource = readSource(
      "apps/portal/src/app/login/LoginForm.tsx",
    );

    assert.match(loginFormSource, /signIn\(["']credentials["']/);
    assert.match(loginFormSource, /redirect:\s*false/);
    assert.match(loginFormSource, /callbackUrl/);
    assert.match(loginFormSource, /getSession\(\)/);
    assert.match(
      loginFormSource,
      /trackAnalyticsEvent\(["']user_logged_in["']/,
    );
    assert.match(loginFormSource, /window\.location\.href/);

    assert.match(loginFormSource, /Forgot password\?/);
    assert.match(loginFormSource, /href=["']\/forgot-password["']/);
    assert.match(loginFormSource, /Register Your Academy/);
    assert.match(loginFormSource, /href=["']\/register\/academy["']/);
    assert.match(loginFormSource, /Create User Account/);
    assert.match(loginFormSource, /href=["']\/register["']/);
  });

  it("keeps the login page success banner and safe redirect handling", () => {
    const loginPageSource = readSource("apps/portal/src/app/login/page.tsx");

    assert.match(loginPageSource, /function\s+safeRedirectTarget/);
    assert.match(loginPageSource, /startsWith\(["']\/["']\)/);
    assert.doesNotMatch(loginPageSource, /new URL\(redirectTarget\)/);
    assert.match(loginPageSource, /registered\s*===\s*["']1["']/);
    assert.match(loginPageSource, /verifyEmail\s*===\s*["']1["']/);
    assert.match(
      loginPageSource,
      /<LoginForm\s+callbackUrl=\{safeRedirectTarget/,
    );
    assert.match(loginPageSource, /Welcome back/);
    assert.match(loginPageSource, /Sign in to your academy account/);
  });

  it("provides a public academy registration entry point that routes owners to claim or contact", () => {
    const academyRegisterSource = readSource(
      "apps/portal/src/app/register/academy/page.tsx",
    );

    assert.match(academyRegisterSource, /Register your academy or dojo/);
    assert.match(academyRegisterSource, /LocationSearchForm/);
    assert.match(academyRegisterSource, /action=["']\/academies["']/);
    assert.match(academyRegisterSource, /autoLocate=\{false\}/);
    assert.match(academyRegisterSource, /Claim this academy/);
    assert.match(academyRegisterSource, /href=["']\/academies["']/);
    assert.match(academyRegisterSource, /href=["']\/contact["']/);
    assert.match(academyRegisterSource, /href=["']\/register["']/);
  });
});
