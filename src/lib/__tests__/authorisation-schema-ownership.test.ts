import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("services/authorisation/migrations/001_core_schema.sql", "utf8");
const schema = readFileSync("services/authorisation/migrations/schema/001_authorisation_schema.sql", "utf8");
const permissionsTable = readFileSync("services/authorisation/migrations/tables/001_permissions.sql", "utf8");
const seedCatalog = readFileSync("services/authorisation/migrations/procedures/001_seedAuthorisationCatalog.sql", "utf8");
const repository = readFileSync("services/authorisation/internal/server/repository.go", "utf8");
const migrationCommand = readFileSync("services/authorisation/cmd/migrate-users-authorisation/main.go", "utf8");

test("Authorisation migration owns the authorisation schema", () => {
  assert.match(schema, /CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS\s+authorisation/i);
  assert.match(migration, /SET\s+search_path\s+TO\s+authorisation,\s*public/i);
});

test("Authorisation migration follows the service migration folder structure", () => {
  assert.match(migration, /\\ir\s+schema\/001_authorisation_schema\.sql/);
  assert.match(migration, /\\ir\s+tables\/001_permissions\.sql/);
  assert.match(migration, /\\ir\s+functions\/001_scopeMatches\.sql/);
  assert.match(migration, /\\ir\s+procedures\/001_seedAuthorisationCatalog\.sql/);
});

test("Authorisation runtime scopes database connections to the authorisation schema", () => {
  assert.match(repository, /search_path=authorisation,public/);
  assert.match(migrationCommand, /search_path=authorisation,public/);
});

test("Authorisation permissions are capability codes without numeric levels", () => {
  assert.doesNotMatch(permissionsTable, /\blevel\b/);
  assert.doesNotMatch(seedCatalog, /INSERT INTO permissions \(id, code, name, description, level\)/);
  assert.doesNotMatch(repository, /permissions\.level|p\.level|permission\.Level/);
});

test("Authorisation seed keeps platform payment revenue separate from academy payment metrics", () => {
  assert.match(seedCatalog, /payment\.report\.revenue\.read/);
  assert.match(seedCatalog, /payment\.report\.refund\.read/);
  assert.match(seedCatalog, /payment\.report\.platform_revenue\.read/);

  const academyWhereIndex = seedCatalog.indexOf("WHERE r.key IN ('ACADEMY_OWNER', 'ACADEMY_ADMIN')");
  const academyJoinIndex = seedCatalog.lastIndexOf("JOIN permissions p ON p.code IN", academyWhereIndex);
  const academyConflictIndex = seedCatalog.indexOf("ON CONFLICT DO NOTHING;", academyWhereIndex);
  const academyRoleBlock = seedCatalog.slice(academyJoinIndex, academyConflictIndex);
  assert.match(academyRoleBlock, /payment\.report\.revenue\.read/);
  assert.match(academyRoleBlock, /payment\.report\.refund\.read/);
  assert.doesNotMatch(academyRoleBlock, /payment\.report\.platform_revenue\.read/);
});
