import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("users service owns a constrained account deletion lifecycle", () => {
  const table = source("apps/backend_api/internal/services/users/migrations/tables/007_account_deletion_requests.sql");
  const functions = source("apps/backend_api/internal/services/users/migrations/functions/013_account_deletion_requests.sql");
  const server = source("apps/backend_api/internal/services/users/server/account_deletion_requests.go");
  const authorisationSeed = source("apps/backend_api/internal/services/authorisation/migrations/procedures/001_seedAuthorisationCatalog.sql");
  const authorisationMigration = source("apps/backend_api/internal/services/authorisation/migrations/021_seed_account_update_permission.sql");

  assert.match(table, /PENDING_VERIFICATION/);
  assert.match(table, /PENDING_PROCESSING/);
  assert.match(table, /CANCELLED/);
  assert.match(table, /UNIQUE INDEX[\s\S]*user_id[\s\S]*PENDING_VERIFICATION/);
  assert.match(table, /token_hash/);
  assert.doesNotMatch(table, /\btoken text\b/);
  assert.match(functions, /interval '1 month'/);
  assert.match(functions, /token_hash = NULL/);
  assert.match(server, /passwordResetHash\(token\)/);
  assert.match(server, /actorFromRequest/);
  assert.match(authorisationSeed, /'account\.read', 'account\.update'/);
  assert.match(authorisationMigration, /CALL "seedAuthorisationCatalog"\(\)/);
});

test("public account deletion prevents enumeration and uses queued email", () => {
  const actions = source("apps/portal/src/app/account-deletion/actions.ts");
  const email = source("apps/portal/src/lib/account-deletion.ts");
  const page = source("apps/portal/src/app/account-deletion/page.tsx");

  assert.match(actions, /If a RollFinders account exists for that email/);
  assert.match(actions, /catch\s*\{[\s\S]*Account existence/);
  assert.match(email, /queueEmail/);
  assert.match(email, /account_deletion_verification/);
  assert.match(email, /account_deletion_acknowledgement/);
  assert.match(page, /one calendar month/i);
  assert.match(page, /law requires/i);
});

test("shared dashboard uses mobile presentation without a separate permission model", () => {
  const dashboard = source("apps/portal/src/app/dashboard/page.tsx");
  const mobile = source("apps/portal/src/app/mobile/page.tsx");
  const deletionPanel = source("apps/portal/src/app/dashboard/settings/AccountDeletionPanel.tsx");

  assert.match(mobile, /redirect\("\/dashboard\?panel=profile&surface=mobile"\)/);
  assert.match(dashboard, /mobileSurface = firstParam\(params\.surface\) === "mobile"/);
  assert.match(dashboard, /!mobileSurface \? \(/);
  assert.match(dashboard, /<MobileNavigation activeTab="profile"/);
  assert.match(deletionPanel, /Leaving an academy is a separate action/);
  assert.match(deletionPanel, /cancelOwnAccountDeletion/);
});
