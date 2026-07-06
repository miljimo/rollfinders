CREATE TABLE IF NOT EXISTS resources (
    id text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    target text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

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

DROP INDEX IF EXISTS resources_type_idx;

ALTER TABLE resources
    DROP COLUMN IF EXISTS type;

ALTER TABLE resources
    ADD COLUMN IF NOT EXISTS name text,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS target text;

UPDATE resources
SET name = COALESCE(NULLIF(name, ''), id);

ALTER TABLE resources
    ALTER COLUMN name SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS resources_name_key ON resources (name);
CREATE INDEX IF NOT EXISTS resources_target_idx ON resources (target);
