\ir schema/001_user_schema.sql
SET search_path TO users, public;

\ir schema/002_schema_migrations.sql
\ir types/001_user_types.sql
\ir tables/001_users.sql
\ir tables/002_credentials.sql
\ir tables/002_password_reset_tokens.sql
\ir tables/003_organisations.sql
\ir tables/004_user_roles_and_permissions.sql
\ir tables/005_sessions_and_mfa.sql
\ir tables/006_admin_audit_logs.sql
\ir functions/001_user_get.sql
\ir functions/002_user_get_by_email.sql
\ir functions/003_user_account_get.sql
\ir functions/004_users_count.sql
\ir functions/005_users_list.sql
\ir functions/008_active_super_user_exists.sql
\ir functions/012_runtime_queries.sql
\ir procedures/001_userLastLoginTouch.sql
\ir procedures/002_userInsert.sql
\ir procedures/003_userUpdate.sql
\ir procedures/004_userMutationSet.sql
\ir procedures/005_userDelete.sql
\ir procedures/006_adminAuditLogInsert.sql
\ir procedures/008_runtimeMutations.sql

INSERT INTO schema_migrations(version) VALUES ('001_core_schema')
ON CONFLICT (version) DO NOTHING;
