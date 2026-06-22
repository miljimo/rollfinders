CREATE TABLE IF NOT EXISTS user_permissions (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    permission_id text NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    effect text NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
    organisation_id text,
    application_id text,
    resource_type text,
    resource_id text,
    assigned_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_permissions_user_permission_scope_idx ON user_permissions (user_id, permission_id, organisation_id, application_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS user_permissions_permission_id_idx ON user_permissions (permission_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_permissions_user_permission_scope_key ON user_permissions (
    user_id,
    permission_id,
    COALESCE(organisation_id, ''),
    COALESCE(application_id, ''),
    COALESCE(resource_type, ''),
    COALESCE(resource_id, '')
);
