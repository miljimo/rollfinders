CREATE TABLE IF NOT EXISTS notification.outbox_events (
    id text PRIMARY KEY,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status notification.outbox_status NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_available
    ON notification.outbox_events (status, available_at);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_aggregate
    ON notification.outbox_events (aggregate_type, aggregate_id);
