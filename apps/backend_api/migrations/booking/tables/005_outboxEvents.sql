CREATE TABLE IF NOT EXISTS booking.outbox_events (
    id text PRIMARY KEY,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status booking.outbox_status NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_outbox_status_available ON booking.outbox_events (status, available_at);
CREATE INDEX IF NOT EXISTS idx_booking_outbox_aggregate ON booking.outbox_events (aggregate_type, aggregate_id);
