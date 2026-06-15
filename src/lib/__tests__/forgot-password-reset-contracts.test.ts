import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSource(path: string) {
  assert.equal(existsSync(path), true, `${path} must exist`);
  return readFileSync(path, "utf8");
}

function readFirstSource(paths: string[]) {
  const path = paths.find((candidate) => existsSync(candidate));
  assert.ok(path, `${paths.join(" or ")} must exist`);
  return readFileSync(path, "utf8");
}

describe("forgot password and password reset contracts", () => {
  it("keeps forgot-password reset reachable from the login form", () => {
    const loginFormSource = readSource("src/app/login/LoginForm.tsx");

    assert.match(loginFormSource, /Forgot password\?/);
    assert.match(loginFormSource, /href=["']\/forgot-password["']/);
  });

  it("provides a public forgot-password page with a generic success message", () => {
    const pageSource = readSource("src/app/forgot-password/page.tsx");
    const formSource = readSource("src/app/forgot-password/ForgotPasswordForm.tsx");
    const actionSource = readSource("src/app/forgot-password/actions.ts");
    const routeSource = `${pageSource}\n${formSource}\n${actionSource}`;

    assert.match(pageSource, /<ForgotPasswordForm\s*\/>/);
    assert.match(routeSource, /type=["']email["']/);
    assert.match(routeSource, /\brequired\b/);
    assert.match(routeSource, /Send reset link/);
    assert.match(routeSource, /If an account exists for this email, a password reset link has been sent\./);
  });

  it("keeps the forgot-password request route generic for known and unknown accounts", () => {
    const routeSource = readFirstSource([
      "src/app/api/auth/forgot-password/route.ts",
      "src/app/api/auth/password/reset/request/route.ts",
    ]);

    assert.match(routeSource, /export\s+async\s+function\s+POST\(/);
    assert.match(routeSource, /NextResponse\.json\(\{\s*success:\s*true\s*\}/);
    assert.doesNotMatch(routeSource, /User not found|Account disabled|Disabled|does not exist/);
  });

  it("keeps the legacy reset-password token route compatible", () => {
    const pageSource = readSource("src/app/reset-password/[token]/page.tsx");
    const actionSource = readSource("src/app/reset-password/[token]/actions.ts");
    const formSource = readSource("src/app/reset-password/[token]/ResetPasswordForm.tsx");

    assert.match(pageSource, /params:\s*Promise<\{\s*token:\s*string\s*\}>/);
    assert.match(pageSource, /getValidPasswordResetToken\(token\)/);
    assert.match(pageSource, /if\s*\(!resetToken\)\s*notFound\(\)/);
    assert.match(actionSource, /resetPasswordWithToken\(token,\s*password\)/);
    assert.match(formSource, /href=["']\/login["']/);
  });
});
