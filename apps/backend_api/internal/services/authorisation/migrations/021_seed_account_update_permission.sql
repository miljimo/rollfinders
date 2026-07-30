SET search_path TO authorisation, public;

\ir procedures/001_seedAuthorisationCatalog.sql

CALL "seedAuthorisationCatalog"();

INSERT INTO schema_migrations(version) VALUES ('021_seed_account_update_permission')
ON CONFLICT (version) DO NOTHING;
