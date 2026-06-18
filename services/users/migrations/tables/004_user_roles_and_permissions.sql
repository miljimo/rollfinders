CREATE TABLE IF NOT EXISTS organisation_users (
    organisation_id text NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organisation_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_key text NOT NULL REFERENCES roles(key) ON DELETE CASCADE,
    organisation_id text REFERENCES organisations(id) ON DELETE CASCADE,
    assigned_by text REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    privilege_key text NOT NULL REFERENCES privileges(key) ON DELETE CASCADE,
    organisation_id text REFERENCES organisations(id) ON DELETE CASCADE,
    effect "DirectPermissionEffect" NOT NULL,
    assigned_by text REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organisation_users_user_id_idx ON organisation_users (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_scope_key ON user_roles (user_id, role_key, COALESCE(organisation_id, ''));
CREATE INDEX IF NOT EXISTS user_roles_role_key_idx ON user_roles (role_key);
CREATE INDEX IF NOT EXISTS user_roles_organisation_id_idx ON user_roles (organisation_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_permissions_user_permission_scope_key ON user_permissions (user_id, privilege_key, COALESCE(organisation_id, ''));
CREATE INDEX IF NOT EXISTS user_permissions_privilege_key_idx ON user_permissions (privilege_key);
