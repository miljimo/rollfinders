SET search_path TO authorisation, public;

ALTER TABLE permissions
    DROP COLUMN IF EXISTS level;

\ir procedures/001_seedAuthorisationCatalog.sql

CALL "seedAuthorisationCatalog"();

INSERT INTO schema_migrations(version) VALUES ('002_remove_permission_level')
ON CONFLICT (version) DO NOTHING;
