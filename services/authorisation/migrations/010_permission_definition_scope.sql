SET search_path TO authorisation, public;

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS organisation_id text;

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS application_id text;

ALTER TABLE permissions
    DROP CONSTRAINT IF EXISTS permissions_code_key;

ALTER TABLE permissions
    DROP CONSTRAINT IF EXISTS permissions_code_scope_key;

ALTER TABLE permissions
    ADD CONSTRAINT permissions_code_scope_key
    UNIQUE NULLS NOT DISTINCT (code, organisation_id, application_id);

CREATE INDEX IF NOT EXISTS permissions_code_idx ON permissions (code);
CREATE INDEX IF NOT EXISTS permissions_scope_idx ON permissions (organisation_id, application_id);

INSERT INTO schema_migrations(version)
VALUES ('010_permission_definition_scope')
ON CONFLICT (version) DO NOTHING;
