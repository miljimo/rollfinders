SET search_path TO authorisation, public;

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS resource_id text;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'authorisation'
          AND table_name = 'permissions'
          AND column_name = 'code'
    ) THEN
        INSERT INTO resources (id, name, description)
        SELECT DISTINCT
            (md5(code))::uuid::text,
            code,
            description
        FROM permissions
        WHERE code LIKE '%.%'
        ON CONFLICT (name) DO UPDATE
        SET id = EXCLUDED.id,
            name = EXCLUDED.name,
            description = COALESCE(EXCLUDED.description, resources.description),
            updated_at = now();

        UPDATE permissions
        SET resource_id = (md5(code))::uuid::text
        WHERE resource_id IS NULL
          AND code LIKE '%.%';
    END IF;
END $$;

ALTER TABLE permissions
    DROP CONSTRAINT IF EXISTS permissions_resource_id_fkey;

ALTER TABLE permissions
    ADD CONSTRAINT permissions_resource_id_fkey
    FOREIGN KEY (resource_id) REFERENCES resources(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE permissions
    ALTER COLUMN resource_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS permissions_resource_id_idx ON permissions (resource_id);

INSERT INTO schema_migrations(version)
VALUES ('013_permission_resource_reference')
ON CONFLICT (version) DO NOTHING;
