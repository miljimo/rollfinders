\ir schema/001_authorisation_schema.sql
SET search_path TO authorisation, public;

\ir schema/002_schema_migrations.sql
\ir tables/007_resources.sql
\ir tables/001_permissions.sql
\ir tables/002_roles.sql
\ir tables/003_role_permissions.sql
\ir tables/004_user_roles.sql
\ir tables/005_user_permissions.sql
\ir tables/006_authorisation_audit_events.sql
\ir 009_resource_scope_table.sql
\ir 010_permission_definition_scope.sql
\ir 012_permission_created_by.sql
\ir 013_permission_resource_reference.sql
\ir functions/001_scopeMatches.sql
\ir functions/002_repository.sql
\ir procedures/001_seedAuthorisationCatalog.sql

CALL "seedAuthorisationCatalog"();
\ir 014_role_generated_ids.sql
\ir 015_role_created_by.sql
\ir 016_resources_table_shape.sql
\ir 017_resource_uuid_ids.sql
\ir 018_drop_resource_type.sql
\ir 019_permission_resource_metadata.sql
\ir 020_seed_academy_wallet_permissions.sql
\ir 021_seed_account_update_permission.sql
\ir 022_seed_academy_user_management_permissions.sql
\ir 023_backfill_missing_standard_user_roles.sql

INSERT INTO schema_migrations(version) VALUES ('001_core_schema')
ON CONFLICT (version) DO NOTHING;
