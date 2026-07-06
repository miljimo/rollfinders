SET search_path TO authorisation, public;

\ir procedures/001_seedAuthorisationCatalog.sql

CALL "seedAuthorisationCatalog"();

INSERT INTO schema_migrations(version) VALUES ('003_seed_standard_user_permissions')
ON CONFLICT (version) DO NOTHING;
