SET search_path TO authorisation, public;

ALTER TABLE resources
    ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE permissions
    DROP CONSTRAINT IF EXISTS permissions_resource_scope_key;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'authorisation'
          AND table_name = 'permissions'
          AND column_name = 'code'
	    ) THEN
	        CREATE TEMP TABLE permission_resource_merges ON COMMIT DROP AS
	        SELECT DISTINCT
	            p.resource_id AS old_resource_id,
	            canonical.id AS canonical_resource_id
	        FROM permissions p
	        JOIN resources canonical
	          ON canonical.name = p.code
	         AND canonical.id <> p.resource_id
	        WHERE p.code IS NOT NULL;

	        UPDATE permissions p
	        SET resource_id = permission_resource_merges.canonical_resource_id,
	            updated_at = now()
	        FROM permission_resource_merges
	        WHERE p.resource_id = permission_resource_merges.old_resource_id;

	        DELETE FROM resources r
	        USING permission_resource_merges
	        WHERE r.id = permission_resource_merges.old_resource_id
	          AND NOT EXISTS (
	            SELECT 1
	            FROM permissions p
	            WHERE p.resource_id = r.id
	        );

	        DROP TABLE permission_resource_merges;

	        UPDATE resources canonical
	        SET description = COALESCE(NULLIF(p.description, ''), canonical.description),
	            updated_at = now()
	        FROM permissions p
	        WHERE canonical.name = p.code
	          AND p.code IS NOT NULL;

	        UPDATE resources r
	        SET name = p.code,
	            description = COALESCE(NULLIF(p.description, ''), r.description),
	            updated_at = now()
	        FROM permissions p
	        WHERE p.resource_id = r.id
	          AND p.code IS NOT NULL
	          AND NOT EXISTS (
	            SELECT 1
	            FROM resources existing
	            WHERE existing.name = p.code
	              AND existing.id <> r.id
	        );
    END IF;
END $$;

ALTER TABLE permissions
    DROP CONSTRAINT IF EXISTS permissions_code_scope_key;

ALTER TABLE permissions
    DROP CONSTRAINT IF EXISTS permissions_resource_scope_key;

ALTER TABLE role_permissions
    DROP CONSTRAINT IF EXISTS role_permissions_pkey;

DROP INDEX IF EXISTS user_permissions_user_permission_scope_key;

WITH ranked AS (
    SELECT
        id,
        FIRST_VALUE(id) OVER (
            PARTITION BY resource_id, organisation_id, application_id
            ORDER BY created_at, id
        ) AS keep_id,
        ROW_NUMBER() OVER (
            PARTITION BY resource_id, organisation_id, application_id
            ORDER BY created_at, id
        ) AS row_number
    FROM permissions
)
DELETE FROM role_permissions rp
USING ranked
WHERE rp.permission_id = ranked.id
  AND ranked.row_number > 1
  AND EXISTS (
      SELECT 1
      FROM role_permissions kept
      WHERE kept.role_id = rp.role_id
        AND kept.permission_id = ranked.keep_id
  );

WITH ranked AS (
    SELECT
        id,
        FIRST_VALUE(id) OVER (
            PARTITION BY resource_id, organisation_id, application_id
            ORDER BY created_at, id
        ) AS keep_id,
        ROW_NUMBER() OVER (
            PARTITION BY resource_id, organisation_id, application_id
            ORDER BY created_at, id
        ) AS row_number
    FROM permissions
)
UPDATE role_permissions rp
SET permission_id = ranked.keep_id
FROM ranked
WHERE rp.permission_id = ranked.id
  AND ranked.row_number > 1;

WITH ranked AS (
    SELECT
        id,
        FIRST_VALUE(id) OVER (
            PARTITION BY resource_id, organisation_id, application_id
            ORDER BY created_at, id
        ) AS keep_id,
        ROW_NUMBER() OVER (
            PARTITION BY resource_id, organisation_id, application_id
            ORDER BY created_at, id
        ) AS row_number
    FROM permissions
)
UPDATE user_permissions up
SET permission_id = ranked.keep_id
FROM ranked
WHERE up.permission_id = ranked.id
  AND ranked.row_number > 1;

DELETE FROM user_permissions up
USING user_permissions duplicate
WHERE up.ctid < duplicate.ctid
  AND up.user_id = duplicate.user_id
  AND up.permission_id = duplicate.permission_id
  AND COALESCE(up.organisation_id, '') = COALESCE(duplicate.organisation_id, '')
  AND COALESCE(up.application_id, '') = COALESCE(duplicate.application_id, '')
  AND COALESCE(up.resource_id, '') = COALESCE(duplicate.resource_id, '');

DELETE FROM role_permissions rp
USING role_permissions duplicate
WHERE rp.ctid < duplicate.ctid
  AND rp.role_id = duplicate.role_id
  AND rp.permission_id = duplicate.permission_id;

ALTER TABLE role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_permissions_user_permission_scope_key ON user_permissions (
    user_id,
    permission_id,
    COALESCE(organisation_id, ''),
    COALESCE(application_id, ''),
    COALESCE(resource_id, '')
);

WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY resource_id, organisation_id, application_id
            ORDER BY created_at, id
        ) AS row_number
    FROM permissions
)
DELETE FROM permissions p
USING ranked
WHERE p.id = ranked.id
  AND ranked.row_number > 1;

ALTER TABLE permissions
    ADD CONSTRAINT permissions_resource_scope_key
    UNIQUE NULLS NOT DISTINCT (resource_id, organisation_id, application_id);

DROP INDEX IF EXISTS permissions_code_idx;

ALTER TABLE permissions
    DROP COLUMN IF EXISTS code,
    DROP COLUMN IF EXISTS name,
    DROP COLUMN IF EXISTS description;

DELETE FROM resources r
WHERE NULLIF(r.target, '') IS NULL
  AND r.name !~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$'
  AND NOT EXISTS (
    SELECT 1
    FROM permissions p
    WHERE p.resource_id = r.id
);

CREATE INDEX IF NOT EXISTS permissions_resource_id_idx ON permissions (resource_id);

INSERT INTO schema_migrations(version)
VALUES ('019_permission_resource_metadata')
ON CONFLICT (version) DO NOTHING;
