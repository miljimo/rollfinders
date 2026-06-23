SET search_path TO authorisation, public;

\ir tables/007_resources.sql

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'authorisation'
          AND table_name = 'user_roles'
          AND column_name = 'resource_type'
    ) THEN
        INSERT INTO resources (id, resource_type)
        SELECT DISTINCT resource_id, COALESCE(resource_type, 'unknown')
        FROM user_roles
        WHERE resource_id IS NOT NULL
        ON CONFLICT (id) DO UPDATE
        SET resource_type = EXCLUDED.resource_type,
            updated_at = now();
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'authorisation'
          AND table_name = 'user_permissions'
          AND column_name = 'resource_type'
    ) THEN
        INSERT INTO resources (id, resource_type)
        SELECT DISTINCT resource_id, COALESCE(resource_type, 'unknown')
        FROM user_permissions
        WHERE resource_id IS NOT NULL
        ON CONFLICT (id) DO UPDATE
        SET resource_type = EXCLUDED.resource_type,
            updated_at = now();
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'authorisation'
          AND table_name = 'authorisation_audit_events'
          AND column_name = 'resource_type'
    ) THEN
        INSERT INTO resources (id, resource_type)
        SELECT DISTINCT resource_id, COALESCE(resource_type, 'unknown')
        FROM authorisation_audit_events
        WHERE resource_id IS NOT NULL
        ON CONFLICT (id) DO UPDATE
        SET resource_type = EXCLUDED.resource_type,
            updated_at = now();
    END IF;
END $$;

DROP INDEX IF EXISTS user_roles_user_scope_idx;
DROP INDEX IF EXISTS user_roles_user_role_scope_key;

ALTER TABLE user_roles
    DROP CONSTRAINT IF EXISTS user_roles_resource_id_fkey;

ALTER TABLE user_roles
    ADD CONSTRAINT user_roles_resource_id_fkey
    FOREIGN KEY (resource_id) REFERENCES resources(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE user_roles
    DROP COLUMN IF EXISTS resource_type;

CREATE INDEX IF NOT EXISTS user_roles_user_scope_idx ON user_roles (user_id, organisation_id, application_id, resource_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_scope_key ON user_roles (
    user_id,
    role_id,
    COALESCE(organisation_id, ''),
    COALESCE(application_id, ''),
    COALESCE(resource_id, '')
);

DROP INDEX IF EXISTS user_permissions_user_permission_scope_idx;
DROP INDEX IF EXISTS user_permissions_user_permission_scope_key;

ALTER TABLE user_permissions
    DROP CONSTRAINT IF EXISTS user_permissions_resource_id_fkey;

ALTER TABLE user_permissions
    ADD CONSTRAINT user_permissions_resource_id_fkey
    FOREIGN KEY (resource_id) REFERENCES resources(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE user_permissions
    DROP COLUMN IF EXISTS resource_type;

CREATE INDEX IF NOT EXISTS user_permissions_user_permission_scope_idx ON user_permissions (user_id, permission_id, organisation_id, application_id, resource_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_permissions_user_permission_scope_key ON user_permissions (
    user_id,
    permission_id,
    COALESCE(organisation_id, ''),
    COALESCE(application_id, ''),
    COALESCE(resource_id, '')
);

ALTER TABLE authorisation_audit_events
    DROP CONSTRAINT IF EXISTS authorisation_audit_events_resource_id_fkey;

ALTER TABLE authorisation_audit_events
    ADD CONSTRAINT authorisation_audit_events_resource_id_fkey
    FOREIGN KEY (resource_id) REFERENCES resources(id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE authorisation_audit_events
    DROP COLUMN IF EXISTS resource_type;

INSERT INTO schema_migrations(version) VALUES ('009_resource_scope_table')
ON CONFLICT (version) DO NOTHING;
