SET search_path TO authorisation, public;
\ir procedures/001_seedAuthorisationCatalog.sql

CALL "seedAuthorisationCatalog"();

INSERT INTO schema_migrations(version)
VALUES ('004_seed_academy_public_enabled_permission')
ON CONFLICT (version) DO NOTHING;
