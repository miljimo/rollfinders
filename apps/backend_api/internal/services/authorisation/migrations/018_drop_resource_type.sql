SET search_path TO authorisation, public;

DROP INDEX IF EXISTS resources_type_idx;

ALTER TABLE resources
    DROP COLUMN IF EXISTS type;

INSERT INTO schema_migrations(version)
VALUES ('018_drop_resource_type')
ON CONFLICT (version) DO NOTHING;
