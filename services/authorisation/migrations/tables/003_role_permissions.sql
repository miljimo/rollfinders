CREATE TABLE IF NOT EXISTS role_permissions (
    role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id text NOT NULL REFERENCES permissions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);
