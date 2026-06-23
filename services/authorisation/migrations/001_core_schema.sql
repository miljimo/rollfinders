\ir schema/001_authorisation_schema.sql
SET search_path TO authorisation, public;

\ir schema/002_schema_migrations.sql
\ir tables/001_permissions.sql
\ir tables/002_roles.sql
\ir tables/007_resources.sql
\ir tables/008_applicationServicePermissions.sql
\ir tables/003_role_permissions.sql
\ir tables/004_user_roles.sql
\ir tables/005_user_permissions.sql
\ir tables/006_authorisation_audit_events.sql
\ir 009_resource_scope_table.sql
\ir 010_permission_definition_scope.sql
\ir functions/001_scopeMatches.sql
\ir functions/002_permissionApplicationEnabled.sql
\ir procedures/001_seedAuthorisationCatalog.sql

CALL "seedAuthorisationCatalog"();

INSERT INTO schema_migrations(version) VALUES ('001_core_schema')
ON CONFLICT (version) DO NOTHING;
