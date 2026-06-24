import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const routeSource = readFileSync("apps/portal/src/app/api/admin/users/[id]/password-reset/route.ts", "utf8");
const actionSource = readFileSync("apps/portal/src/app/admin/users/actions.ts", "utf8");
const dashboardSource = readFileSync("apps/portal/src/app/dashboard/AdminDashboardWorkspace.tsx", "utf8");
const adminUsersPageSource = readFileSync("apps/portal/src/app/admin/users/page.tsx", "utf8");

describe("admin-triggered password reset contracts", () => {
  it("routes admin reset requests through the shared permission contract before queueing email", () => {
    assert.match(routeSource, /export\s+async\s+function\s+POST\(request:\s*Request,\s*\{\s*params\s*\}:\s*\{\s*params:\s*Promise<\{\s*id:\s*string\s*\}>\s*\}\)/);
    assert.match(routeSource, /const\s+returnTo\s*=\s*await\s+formReturnTo\(request\)/);
    assert.match(routeSource, /function\s+resultRedirect/);
    assert.match(routeSource, /const\s+\{\s*id\s*\}\s*=\s*await\s+params/);
    assert.match(routeSource, /getManagedUser\(actor,\s*id\)/);
    assert.match(routeSource, /if\s*\(!user\)\s*return\s+NextResponse\.json\(\{\s*error:\s*"User not found"\s*\},\s*\{\s*status:\s*404\s*\}\)/);
    assert.match(routeSource, /if\s*\(!canSendManagedUserPasswordReset\(actor,\s*\{\s*\.\.\.user,\s*role:\s*user\.role\s+as\s+Role\s*\}\)\)/);
    assert.match(routeSource, /try\s*\{\s*\(\{\s*expiresAt\s*\}\s*=\s*await\s+requestPasswordResetForEmail\(user\.email\)\);/);
    assert.match(routeSource, /catch\s*\{\s*if\s*\(wantsRedirect\)\s*return\s+resultRedirect\(request,\s*returnTo,\s*"password_reset_failed",\s*user\.email\);/);
    assert.match(routeSource, /return\s+NextResponse\.json\(\{\s*error:\s*"Password reset email could not be sent"\s*\},\s*\{\s*status:\s*500\s*\}\)/);
    assert.match(routeSource, /action:\s*"USER_PASSWORD_RESET_EMAIL_SENT"/);
    assert.match(routeSource, /metadata:\s*\{\s*email:\s*user\.email,\s*expiresAt:\s*expiresAt\.toISOString\(\)\s*\}/);

    assert.ok(
      routeSource.indexOf("await requestPasswordResetForEmail(user.email)") > routeSource.indexOf("!canSendManagedUserPasswordReset(actor, { ...user"),
      "password reset email must only be requested after permission checks",
    );
    assert.ok(
      routeSource.indexOf('action: "USER_PASSWORD_RESET_EMAIL_SENT"') > routeSource.indexOf("await requestPasswordResetForEmail(user.email)"),
      "audit log must be written after the reset email is requested",
    );
  });

  it("returns visible feedback after admin password reset form submissions", () => {
    assert.match(actionSource, /export\s+async\s+function\s+sendPasswordChangeEmail\(userId:\s*string,\s*formData\?:\s*FormData\)/);
    assert.match(actionSource, /managedUsersReturnPath\(String\(formData\?\.get\("returnTo"\)\s*\?\?\s*"\/dashboard\/users"\)\)/);
    assert.match(actionSource, /await\s+requestPasswordResetForEmail\(user\.email\)/);
    assert.match(actionSource, /userResult",\s*"password_reset_sent"/);
    assert.match(actionSource, /userResult",\s*"password_reset_failed"/);
    assert.match(actionSource, /email",\s*user\.email/);
    assert.match(actionSource, /redirect\(`\$\{url\.pathname\}\$\{url\.search\}`\)/);

    for (const source of [dashboardSource, adminUsersPageSource]) {
      assert.match(source, /action=\{`\/api\/admin\/users\/\$\{user\.id\}\/password-reset`\}\s+method="post"/);
      assert.match(source, /password_reset_sent/);
      assert.match(source, /Password reset email sent/);
      assert.match(source, /password_reset_failed/);
      assert.match(source, /Password reset email could not be sent/);
      assert.match(source, /<input\s+type="hidden"\s+name="returnTo"/);
    }
  });
});
