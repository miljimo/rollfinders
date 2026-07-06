ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS created_by text;

UPDATE roles
SET created_by = 'SYSTEM'
WHERE created_by IS NULL
   OR created_by = ''
   OR system_role = true;

ALTER TABLE roles
    ALTER COLUMN created_by SET DEFAULT 'SYSTEM',
    ALTER COLUMN created_by SET NOT NULL;

CREATE INDEX IF NOT EXISTS roles_created_by_idx ON roles (created_by);
