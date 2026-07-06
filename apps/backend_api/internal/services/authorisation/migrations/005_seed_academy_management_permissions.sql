SET search_path TO authorisation, public;
\ir procedures/001_seedAuthorisationCatalog.sql

CALL "seedAuthorisationCatalog"();

INSERT INTO schema_migrations(version)
VALUES ('005_seed_academy_management_permissions')
ON CONFLICT (version) DO NOTHING;
