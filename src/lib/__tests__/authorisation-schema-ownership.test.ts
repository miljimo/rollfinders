import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("services/authorisation/migrations/001_core_schema.sql", "utf8");
const schema = readFileSync("services/authorisation/migrations/schema/001_authorisation_schema.sql", "utf8");
const permissionsTable = readFileSync("services/authorisation/migrations/tables/001_permissions.sql", "utf8");
const userRolesTable = readFileSync("services/authorisation/migrations/tables/004_user_roles.sql", "utf8");
const userPermissionsTable = readFileSync("services/authorisation/migrations/tables/005_user_permissions.sql", "utf8");
const auditEventsTable = readFileSync("services/authorisation/migrations/tables/006_authorisation_audit_events.sql", "utf8");
const resourcesTable = readFileSync("services/authorisation/migrations/tables/007_resources.sql", "utf8");
const resourceScopeMigration = readFileSync("services/authorisation/migrations/009_resource_scope_table.sql", "utf8");
const removeApplicationServicePermissionsMigration = readFileSync("services/authorisation/migrations/011_remove_application_service_permissions.sql", "utf8");
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
  assert.match(migration, /\\ir\s+tables\/007_resources\.sql/);
  assert.doesNotMatch(migration, /applicationServicePermissions/i);
  assert.match(migration, /\\ir\s+009_resource_scope_table\.sql/);
  assert.match(migration, /\\ir\s+010_permission_definition_scope\.sql/);
  assert.match(migration, /\\ir\s+functions\/001_scopeMatches\.sql/);
  assert.doesNotMatch(migration, /permissionApplicationEnabled/i);
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

test("Authorisation permission definitions can be global or scoped to organisation and application", () => {
  assert.match(permissionsTable, /\borganisation_id\s+text\b/);
  assert.match(permissionsTable, /\bapplication_id\s+text\b/);
  assert.match(permissionsTable, /UNIQUE\s+NULLS\s+NOT\s+DISTINCT\s+\(code,\s+organisation_id,\s+application_id\)/i);
  assert.doesNotMatch(permissionsTable, /\bcode\s+text\s+NOT\s+NULL\s+UNIQUE\b/i);
  assert.match(seedCatalog, /ON CONFLICT ON CONSTRAINT permissions_code_scope_key DO UPDATE/);
  assert.match(repository, /organisation_id = NULLIF\(\$5, ''\)/);
  assert.match(repository, /application_id = NULLIF\(\$6, ''\)/);
  assert.match(repository, /p\.organisation_id IS NULL OR p\.organisation_id = \$2/);
  assert.match(repository, /p\.application_id IS NULL OR p\.application_id = \$3/);
});

test("Authorisation permission IDs are generated and not semantic permission codes", () => {
  const endpoints = readFileSync("services/authorisation/internal/server/endpoints.go", "utf8");

  assert.doesNotMatch(seedCatalog, /'perm_[a-z0-9_]+',/);
  assert.doesNotMatch(seedCatalog, /ON CONFLICT \(id\)/);
  assert.match(seedCatalog, /ON CONFLICT ON CONSTRAINT permissions_code_scope_key/);
  assert.match(seedCatalog, /gen_random_bytes\(12\)/);
  assert.doesNotMatch(endpoints, /newID\("perm"\)/);
  assert.match(endpoints, /newID\("permission"\)/);
});

test("Authorisation scopes use a resource table for resource identifiers", () => {
  assert.match(resourcesTable, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+resources/i);
  assert.match(resourcesTable, /\bid\s+text\s+PRIMARY\s+KEY/i);
  assert.match(resourcesTable, /\bresource_type\s+text\s+NOT\s+NULL/i);
  assert.match(resourceScopeMigration, /FOREIGN\s+KEY\s+\(resource_id\)\s+REFERENCES\s+resources\(id\)/i);
  assert.match(repository, /INSERT\s+INTO\s+resources\s+\(id,\s+resource_type\)/);
  assert.match(repository, /LEFT\s+JOIN\s+resources\s+res\s+ON\s+res\.id\s+=\s+up\.resource_id/);
  assert.doesNotMatch(userRolesTable, /\bresource_type\s+text\b/);
  assert.doesNotMatch(userPermissionsTable, /\bresource_type\s+text\b/);
  assert.doesNotMatch(auditEventsTable, /\bresource_type\s+text\b/);
  assert.doesNotMatch(repository, /INSERT\s+INTO\s+user_permissions\s+\([^)]*resource_type[^)]*\)/);
  assert.doesNotMatch(repository, /INSERT\s+INTO\s+user_roles\s+\([^)]*resource_type[^)]*\)/);
});

test("Authorisation does not own application-service enablement", () => {
  assert.doesNotMatch(migration, /application_service_permissions/i);
  assert.doesNotMatch(seedCatalog, /application_service_permissions/i);
  assert.doesNotMatch(repository, /permission_application_enabled|permissionApplicationEnabled/i);
  assert.match(removeApplicationServicePermissionsMigration, /DROP TABLE IF EXISTS application_service_permissions/i);
  assert.match(removeApplicationServicePermissionsMigration, /DROP FUNCTION IF EXISTS permission_application_enabled\(text, text\)/i);
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
