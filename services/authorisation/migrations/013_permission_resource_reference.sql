SET search_path TO authorisation, public;

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS resource_id text;

INSERT INTO resources (id, resource_type, display_name)
SELECT DISTINCT
    regexp_replace(code, '\.[^.]+$', ''),
    regexp_replace(code, '\.[^.]+$', ''),
    initcap(replace(regexp_replace(code, '\.[^.]+$', ''), '.', ' '))
FROM permissions
WHERE code LIKE '%.%'
ON CONFLICT (id) DO UPDATE
SET resource_type = EXCLUDED.resource_type,
    display_name = COALESCE(resources.display_name, EXCLUDED.display_name),
    updated_at = now();

UPDATE permissions
SET resource_id = regexp_replace(code, '\.[^.]+$', '')
WHERE resource_id IS NULL
  AND code LIKE '%.%';

ALTER TABLE permissions
    DROP CONSTRAINT IF EXISTS permissions_resource_id_fkey;

ALTER TABLE permissions
    ADD CONSTRAINT permissions_resource_id_fkey
    FOREIGN KEY (resource_id) REFERENCES resources(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS permissions_resource_id_idx ON permissions (resource_id);

INSERT INTO schema_migrations(version)
VALUES ('013_permission_resource_reference')
ON CONFLICT (version) DO NOTHING;
