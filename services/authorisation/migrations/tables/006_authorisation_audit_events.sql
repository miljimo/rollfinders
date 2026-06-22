CREATE TABLE IF NOT EXISTS authorisation_audit_events (
    id text PRIMARY KEY,
    actor_user_id text,
    target_user_id text,
    action text NOT NULL,
    role_id text,
    permission_id text,
    organisation_id text,
    application_id text,
    resource_type text,
    resource_id text,
    previous_value jsonb,
    new_value jsonb,
    request_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS authorisation_audit_actor_idx ON authorisation_audit_events (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS authorisation_audit_target_idx ON authorisation_audit_events (target_user_id, created_at DESC);
