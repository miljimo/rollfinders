CREATE TABLE IF NOT EXISTS booking.booking_status_history (
    id text PRIMARY KEY,
    booking_id text NOT NULL REFERENCES booking.bookings (id) ON DELETE CASCADE,
    from_status booking.booking_status,
    to_status booking.booking_status NOT NULL,
    reason text,
    changed_by text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking ON booking.booking_status_history (booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_to_status ON booking.booking_status_history (to_status);
