CREATE TABLE IF NOT EXISTS payout_request_audit_events (
    id text PRIMARY KEY,
    payout_request_id text NOT NULL REFERENCES payout_requests(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    actor_id text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_request_audit_events_request_idx
ON payout_request_audit_events(payout_request_id, created_at DESC);
