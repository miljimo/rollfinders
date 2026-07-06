SET search_path TO authorisation, public;

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS organisation_id text;

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS application_id text;

ALTER TABLE permissions
    DROP CONSTRAINT IF EXISTS permissions_code_key;

ALTER TABLE permissions
    DROP CONSTRAINT IF EXISTS permissions_code_scope_key;

DO $$
DECLARE
    has_code boolean;
    has_null_code boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'authorisation'
          AND table_name = 'permissions'
          AND column_name = 'code'
    ) INTO has_code;

    IF has_code THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM permissions WHERE code IS NULL)' INTO has_null_code;
        IF NOT has_null_code THEN
            EXECUTE 'ALTER TABLE permissions ADD CONSTRAINT permissions_code_scope_key UNIQUE NULLS NOT DISTINCT (code, organisation_id, application_id)';
            EXECUTE 'CREATE INDEX IF NOT EXISTS permissions_code_idx ON permissions (code)';
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS permissions_scope_idx ON permissions (organisation_id, application_id);

INSERT INTO schema_migrations(version)
VALUES ('010_permission_definition_scope')
ON CONFLICT (version) DO NOTHING;
