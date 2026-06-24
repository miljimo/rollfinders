CREATE TABLE IF NOT EXISTS booking.idempotency_keys (
    key text PRIMARY KEY,
    scope text NOT NULL,
    request_hash text NOT NULL,
    response_status integer,
    response_body jsonb,
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_idempotency_expires ON booking.idempotency_keys (expires_at);
CREATE INDEX IF NOT EXISTS idx_booking_idempotency_scope ON booking.idempotency_keys (scope);
