CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id text PRIMARY KEY,
    actor_user_id text REFERENCES users(id) ON DELETE SET NULL,
    target_user_id text REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL,
    resource text,
    resource_id text,
    old_value jsonb,
    new_value jsonb,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_user_id_idx ON admin_audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_user_id_idx ON admin_audit_logs (target_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx ON admin_audit_logs (action);
CREATE INDEX IF NOT EXISTS admin_audit_logs_resource_idx ON admin_audit_logs (resource, resource_id);

CREATE TABLE IF NOT EXISTS login_history (
    id text PRIMARY KEY,
    user_id text REFERENCES users(id) ON DELETE SET NULL,
    identifier text NOT NULL,
    success boolean NOT NULL,
    failure_reason text,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_history_user_id_idx ON login_history (user_id);
CREATE INDEX IF NOT EXISTS login_history_identifier_idx ON login_history (identifier);

CREATE TABLE IF NOT EXISTS audit_logs (
    id text PRIMARY KEY,
    actor_id text REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL,
    resource text,
    resource_id text,
    details jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs (resource, resource_id);
