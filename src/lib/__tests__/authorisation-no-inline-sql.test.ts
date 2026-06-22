import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const filesThatMustMoveToStoredProcedures = [
  "services/authorisation/internal/server/audit.go",
  "services/authorisation/internal/server/repository.go",
  "services/authorisation/cmd/migrate-users-authorisation/main.go",
];

const tableLevelSqlPattern = /\b(SELECT|INSERT|UPDATE|DELETE)\b[\s\S]{0,240}\b(FROM|INTO|UPDATE|JOIN)\s+(users\.)?(permissions|roles|role_permissions|user_roles|user_permissions|authorisation_audit_events|privileges|role_privileges)\b/i;

test.skip("Authorisation runtime data access uses stored functions/procedures instead of inline SQL", () => {
  const offenders = filesThatMustMoveToStoredProcedures.flatMap((file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    return tableLevelSqlPattern.test(source) ? [file] : [];
  });

  assert.deepEqual(offenders, []);
});
