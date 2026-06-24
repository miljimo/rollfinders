SET search_path TO authorisation, public;

ALTER TABLE role_permissions
    DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;

ALTER TABLE role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE user_permissions
    DROP CONSTRAINT IF EXISTS user_permissions_permission_id_fkey;

ALTER TABLE user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TEMP TABLE permissionIdRewrites (
    old_id text PRIMARY KEY,
    new_id text NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO permissionIdRewrites (old_id, new_id)
SELECT id, 'permission_' || encode(gen_random_bytes(12), 'hex')
FROM permissions
WHERE id LIKE 'perm\_%' ESCAPE '\';

UPDATE permissions p
SET id = rewrites.new_id,
    updated_at = now()
FROM permissionIdRewrites rewrites
WHERE p.id = rewrites.old_id;

\ir procedures/001_seedAuthorisationCatalog.sql

CALL "seedAuthorisationCatalog"();

INSERT INTO schema_migrations(version)
VALUES ('008_generate_permission_ids')
ON CONFLICT (version) DO NOTHING;
