CREATE TABLE IF NOT EXISTS organisation_audit_events (
    id text PRIMARY KEY,
    actor_user_id text,
    organisation_id text,
    application_id text,
    action text NOT NULL,
    previous_value jsonb,
    new_value jsonb,
    request_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organisation_audit_events_organisation_id_idx
    ON organisation_audit_events (organisation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS organisation_audit_events_application_id_idx
    ON organisation_audit_events (application_id, created_at DESC);
