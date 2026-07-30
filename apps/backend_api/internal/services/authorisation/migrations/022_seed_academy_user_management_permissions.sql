\set ON_ERROR_STOP on
SET search_path TO authorisation, public;

\ir procedures/001_seedAuthorisationCatalog.sql

CALL "seedAuthorisationCatalog"();

INSERT INTO schema_migrations(version) VALUES ('022_seed_academy_user_management_permissions')
ON CONFLICT (version) DO NOTHING;
