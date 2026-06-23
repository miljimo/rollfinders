SET search_path TO authorisation, public;

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS created_by text;

CREATE INDEX IF NOT EXISTS permissions_created_by_idx ON permissions (created_by);

INSERT INTO schema_migrations(version)
VALUES ('012_permission_created_by')
ON CONFLICT (version) DO NOTHING;
