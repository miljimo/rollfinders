import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("admin temporary password changes are permission gated and audited atomically", () => {
  const routes = source("apps/backend_api/internal/core/routes/constants.go");
  const procedure = source("apps/backend_api/internal/services/users/migrations/procedures/010_adminTemporaryPasswordSet.sql");
  const action = source("apps/portal/src/app/admin/users/actions.ts");

  assert.match(routes, /user\.password\.set_temporary/);
  assert.match(action, /requireUserManager\("user\.password\.set_temporary"\)/);
  assert.match(procedure, /UPDATE credential_secrets/);
  assert.match(procedure, /UPDATE sessions/);
  assert.match(procedure, /USER_TEMPORARY_PASSWORD_SET/);
  assert.match(procedure, /actor_user_id/);
  assert.match(procedure, /jsonb_build_object\('reason'/);
});

test("admin password notification does not create or disclose a reset credential", () => {
  const action = source("apps/portal/src/app/admin/users/actions.ts");
  const notification = source("apps/portal/src/lib/password-reset.ts");

  assert.match(action, /notifyAdminPasswordChangedBestEffort\(user\)/);
  assert.doesNotMatch(action, /setTemporaryPassword[\s\S]*requestPasswordResetForEmail\(user\.email\)/);
  assert.match(notification, /Password: Not sent by email/);
  assert.match(notification, /Your active sessions were signed out/);
});
