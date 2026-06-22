import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Users core migration does not recreate authorisation ownership tables", () => {
  const coreMigration = readFileSync("services/users/migrations/001_core_schema.sql", "utf8");

  assert.doesNotMatch(coreMigration, /000_roles_and_privileges\.sql/);
  assert.doesNotMatch(coreMigration, /009_role_exists\.sql/);
  assert.doesNotMatch(coreMigration, /011_user_has_privilege\.sql/);
  assert.doesNotMatch(coreMigration, /007_roleAndPermissionManagement\.sql/);
});

test("Users HTTP routes do not expose role or permission management APIs", () => {
  const server = readFileSync("services/users/internal/server/server.go", "utf8");

  assert.doesNotMatch(server, /\/v1\/roles/);
  assert.doesNotMatch(server, /\/v1\/permissions/);
  assert.doesNotMatch(server, /\/v1\/users\/\{id\}\/roles/);
});

test("Users cleanup migration drops legacy authorisation tables", () => {
  const cleanup = readFileSync("services/users/migrations/002_remove_authorisation_tables.sql", "utf8");

  for (const table of ["roles", "privileges", "role_privileges", "user_roles", "user_permissions"]) {
    assert.match(cleanup, new RegExp(`DROP TABLE IF EXISTS ${table}`));
  }
});

test("RollFinders app does not keep a public users projection", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const profileSource = readFileSync("src/lib/rollfinder-user-profiles.ts", "utf8");
  const usersCoreMigration = readFileSync("services/users/migrations/001_core_schema.sql", "utf8");

  assert.doesNotMatch(schema, /model User \{/);
  assert.doesNotMatch(profileSource, /prisma\.user|tx\.user/);
  assert.doesNotMatch(usersCoreMigration, /public\.users|rollfinders_public_user|\\ir backfills\//);
});
