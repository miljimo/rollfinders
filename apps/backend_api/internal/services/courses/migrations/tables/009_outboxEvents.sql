CREATE TABLE IF NOT EXISTS outbox_events (
    id text PRIMARY KEY,
    event_type text NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'PENDING',
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    dispatched_at timestamptz
);

CREATE INDEX IF NOT EXISTS outbox_events_pending_idx ON outbox_events(status, next_attempt_at);
