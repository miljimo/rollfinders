CREATE TABLE IF NOT EXISTS user_roles (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    organisation_id text,
    application_id text,
    resource_id text,
    assigned_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_roles_user_scope_idx ON user_roles (user_id, organisation_id, application_id, resource_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles (role_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_scope_key ON user_roles (
    user_id,
    role_id,
    COALESCE(organisation_id, ''),
    COALESCE(application_id, ''),
    COALESCE(resource_id, '')
);
