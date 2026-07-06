import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("apps/backend_api/internal/services/authorisation/migrations/001_core_schema.sql", "utf8");
const schema = readFileSync("apps/backend_api/internal/services/authorisation/migrations/schema/001_authorisation_schema.sql", "utf8");
const permissionsTable = readFileSync("apps/backend_api/internal/services/authorisation/migrations/tables/001_permissions.sql", "utf8");
const userRolesTable = readFileSync("apps/backend_api/internal/services/authorisation/migrations/tables/004_user_roles.sql", "utf8");
const userPermissionsTable = readFileSync("apps/backend_api/internal/services/authorisation/migrations/tables/005_user_permissions.sql", "utf8");
const auditEventsTable = readFileSync("apps/backend_api/internal/services/authorisation/migrations/tables/006_authorisation_audit_events.sql", "utf8");
const resourcesTable = readFileSync("apps/backend_api/internal/services/authorisation/migrations/tables/007_resources.sql", "utf8");
const resourceScopeMigration = readFileSync("apps/backend_api/internal/services/authorisation/migrations/009_resource_scope_table.sql", "utf8");
const removeApplicationServicePermissionsMigration = readFileSync("apps/backend_api/internal/services/authorisation/migrations/011_remove_application_service_permissions.sql", "utf8");
const seedCatalog = readFileSync("apps/backend_api/internal/services/authorisation/migrations/procedures/001_seedAuthorisationCatalog.sql", "utf8");
const repository = readFileSync("apps/backend_api/internal/services/authorisation/server/repository.go", "utf8");
const migrationCommand = readFileSync("apps/backend_api/cmd/services/authorisation/migrate-users-authorisation/main.go", "utf8");
const endpointSources = [
  "AddRolePermissionHandler.go",
  "AssignUserPermissionHandler.go",
  "AssignUserRoleHandler.go",
  "AuthorizeHandler.go",
  "CreatePermissionHandler.go",
  "CreateResourceHandler.go",
  "CreateRoleHandler.go",
  "DeleteUserPermissionHandler.go",
  "DeleteUserRoleHandler.go",
  "EffectivePermissionsHandler.go",
  "GetPermissionHandler.go",
  "GetRoleHandler.go",
  "ListPermissionsHandler.go",
  "ListResourcesHandler.go",
  "ListRolePermissionsHandler.go",
  "ListRolesHandler.go",
  "ListUserPermissionsHandler.go",
  "ListUserRolesHandler.go",
  "RemoveRolePermissionHandler.go",
  "UpdatePermissionHandler.go",
  "UpdateRoleHandler.go",
]
  .map((file) => readFileSync(`apps/backend_api/internal/services/authorisation/server/${file}`, "utf8"))
  .join("\n");

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
  assert.match(permissionsTable, /\bresource_id\s+text\s+NOT\s+NULL\s+REFERENCES\s+resources\(id\)/i);
  assert.match(permissionsTable, /UNIQUE\s+NULLS\s+NOT\s+DISTINCT\s+\(resource_id,\s+organisation_id,\s+application_id\)/i);
  assert.doesNotMatch(permissionsTable, /\bcode\s+text\s+NOT\s+NULL\s+UNIQUE\b/i);
  assert.match(seedCatalog, /ON CONFLICT ON CONSTRAINT permissions_resource_scope_key DO UPDATE/);
  assert.match(repository, /SELECT \* FROM permission_create\(\$1, \$2, \$3, \$4, \$5\)/);
  assert.match(repository, /p\.OrganisationID,\s*p\.ApplicationID,\s*p\.ResourceID/);
  assert.match(repository, /SELECT \* FROM permission_row_by_code\(\$1, \$2, \$3\)/);
  assert.match(repository, /code,\s*scope\.OrganisationID,\s*scope\.ApplicationID/);
});

test("Authorisation permission IDs are generated and not semantic permission codes", () => {
  const permissionInsertIndex = seedCatalog.indexOf("INSERT INTO permissions (id, resource_id)");
  const rolesInsertIndex = seedCatalog.indexOf("INSERT INTO roles", permissionInsertIndex);
  const permissionInsertBlock = seedCatalog.slice(permissionInsertIndex, rolesInsertIndex);

  assert.doesNotMatch(seedCatalog, /'perm_[a-z0-9_]+',/);
  assert.doesNotMatch(permissionInsertBlock, /ON CONFLICT \(id\)/);
  assert.match(permissionInsertBlock, /ON CONFLICT ON CONSTRAINT permissions_resource_scope_key/);
  assert.match(permissionInsertBlock, /gen_random_bytes\(12\)/);
  assert.doesNotMatch(endpointSources, /newID\("perm"\)/);
  assert.match(endpointSources, /newID\("permission"\)/);
});

test("Authorisation scopes use a resource table for resource identifiers", () => {
  assert.match(resourcesTable, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+resources/i);
  assert.match(resourcesTable, /\bid\s+text\s+PRIMARY\s+KEY/i);
  assert.match(resourcesTable, /\bname\s+text\s+NOT\s+NULL\s+UNIQUE/i);
  assert.match(resourcesTable, /\btarget\s+text\b/i);
  assert.match(resourceScopeMigration, /FOREIGN\s+KEY\s+\(resource_id\)\s+REFERENCES\s+resources\(id\)/i);
  assert.match(repository, /SELECT \* FROM resource_upsert\(\$1, \$2, \$3, \$4\)/);
  assert.match(repository, /resource\.ID,\s*resource\.Name,\s*resource\.Description,\s*resource\.Target/);
  assert.match(repository, /SELECT \* FROM user_role_assign\(\$1, \$2, \$3, \$4, \$5, \$6, \$7\)/);
  assert.match(repository, /a\.Scope\.OrganisationID,\s*a\.Scope\.ApplicationID,\s*a\.Scope\.ResourceID/);
  assert.match(repository, /SELECT \* FROM user_permission_assign\(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8\)/);
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
  const academyJoinIndex = seedCatalog.lastIndexOf("JOIN resources resource ON resource.id = p.resource_id AND resource.name IN", academyWhereIndex);
  const academyConflictIndex = seedCatalog.indexOf("ON CONFLICT DO NOTHING;", academyWhereIndex);
  const academyRoleBlock = seedCatalog.slice(academyJoinIndex, academyConflictIndex);
  assert.match(academyRoleBlock, /account\.read/);
  assert.match(academyRoleBlock, /auth\.session\.read/);
  assert.match(academyRoleBlock, /payment\.report\.revenue\.read/);
  assert.match(academyRoleBlock, /payment\.report\.refund\.read/);
  assert.doesNotMatch(academyRoleBlock, /payment\.report\.platform_revenue\.read/);
});
