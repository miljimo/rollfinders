SET search_path TO authorisation, public;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'authorisation'
          AND table_name = 'resources'
          AND column_name = 'display_name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'authorisation'
          AND table_name = 'resources'
          AND column_name = 'name'
    ) THEN
        ALTER TABLE resources RENAME COLUMN display_name TO name;
    END IF;
END $$;

ALTER TABLE resources
    ADD COLUMN IF NOT EXISTS name text,
    ADD COLUMN IF NOT EXISTS target text;

UPDATE resources
SET name = COALESCE(NULLIF(name, ''), id);

ALTER TABLE resources
    ALTER COLUMN name SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS resources_name_key ON resources (name);
CREATE INDEX IF NOT EXISTS resources_target_idx ON resources (target);

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
    ALTER COLUMN resource_id SET NOT NULL;

INSERT INTO schema_migrations(version)
VALUES ('016_resources_table_shape')
ON CONFLICT (version) DO NOTHING;
