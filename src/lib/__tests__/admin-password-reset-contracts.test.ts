import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const routeSource = readFileSync("src/app/api/admin/users/[id]/password-reset/route.ts", "utf8");

describe("admin-triggered password reset contracts", () => {
  it("routes admin reset requests through the shared permission contract before queueing email", () => {
    assert.match(routeSource, /export\s+async\s+function\s+POST\(_request:\s*Request,\s*\{\s*params\s*\}:\s*\{\s*params:\s*Promise<\{\s*id:\s*string\s*\}>\s*\}\)/);
    assert.match(routeSource, /const\s+\{\s*id\s*\}\s*=\s*await\s+params/);
    assert.match(routeSource, /const\s+user\s*=\s*await\s+prisma\.user\.findUnique\(\{\s*where:\s*\{\s*id\s*\}\s*\}\)/);
    assert.match(routeSource, /if\s*\(!user\)\s*return\s+NextResponse\.json\(\{\s*error:\s*"User not found"\s*\},\s*\{\s*status:\s*404\s*\}\)/);
    assert.match(routeSource, /if\s*\(!canSendManagedUserPasswordReset\(actor,\s*user\)\)/);
    assert.match(routeSource, /const\s+\{\s*expiresAt\s*\}\s*=\s*await\s+queuePasswordResetEmail\(user\)/);
    assert.match(routeSource, /action:\s*"USER_PASSWORD_RESET_EMAIL_SENT"/);
    assert.match(routeSource, /metadata:\s*\{\s*email:\s*user\.email,\s*expiresAt:\s*expiresAt\.toISOString\(\)\s*\}/);

    assert.ok(
      routeSource.indexOf("await queuePasswordResetEmail(user)") > routeSource.indexOf("!canSendManagedUserPasswordReset(actor, user)"),
      "password reset email must only queue after permission checks",
    );
    assert.ok(
      routeSource.indexOf('action: "USER_PASSWORD_RESET_EMAIL_SENT"') > routeSource.indexOf("await queuePasswordResetEmail(user)"),
      "audit log must be written after the reset email is queued",
    );
  });
});
