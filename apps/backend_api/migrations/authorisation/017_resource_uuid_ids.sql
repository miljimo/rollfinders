SET search_path TO authorisation, public;

DROP TABLE IF EXISTS resource_id_migration;

CREATE TEMP TABLE resource_id_migration AS
SELECT
    id AS old_id,
    (md5(id))::uuid::text AS new_id
FROM resources
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE permissions p
SET resource_id = m.new_id
FROM resource_id_migration m
WHERE p.resource_id = m.old_id
  AND EXISTS (
      SELECT 1
      FROM resources existing
      WHERE existing.id = m.new_id
  );

UPDATE user_roles ur
SET resource_id = m.new_id
FROM resource_id_migration m
WHERE ur.resource_id = m.old_id
  AND EXISTS (
      SELECT 1
      FROM resources existing
      WHERE existing.id = m.new_id
  );

UPDATE user_permissions up
SET resource_id = m.new_id
FROM resource_id_migration m
WHERE up.resource_id = m.old_id
  AND EXISTS (
      SELECT 1
      FROM resources existing
      WHERE existing.id = m.new_id
  );

UPDATE authorisation_audit_events audit
SET resource_id = m.new_id
FROM resource_id_migration m
WHERE audit.resource_id = m.old_id
  AND EXISTS (
      SELECT 1
      FROM resources existing
      WHERE existing.id = m.new_id
  );

DELETE FROM resources r
USING resource_id_migration m
WHERE r.id = m.old_id
  AND EXISTS (
      SELECT 1
      FROM resources existing
      WHERE existing.id = m.new_id
  );

UPDATE resources r
SET id = m.new_id,
    updated_at = now()
FROM resource_id_migration m
WHERE r.id = m.old_id;

ALTER TABLE resources
    DROP CONSTRAINT IF EXISTS resources_id_uuid_format;

ALTER TABLE resources
    ADD CONSTRAINT resources_id_uuid_format
    CHECK (id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

INSERT INTO schema_migrations(version)
VALUES ('017_resource_uuid_ids')
ON CONFLICT (version) DO NOTHING;

DROP TABLE IF EXISTS resource_id_migration;
