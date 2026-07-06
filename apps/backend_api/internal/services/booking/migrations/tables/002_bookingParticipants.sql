CREATE TABLE IF NOT EXISTS booking.booking_participants (
    id text PRIMARY KEY,
    booking_id text NOT NULL REFERENCES booking.bookings (id) ON DELETE CASCADE,
    customer_id text,
    guest_reference text,
    display_name text,
    participant_status booking.participant_status NOT NULL DEFAULT 'active',
    attendance_status booking.attendance_status NOT NULL DEFAULT 'unknown',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (customer_id IS NOT NULL OR guest_reference IS NOT NULL OR display_name IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_booking_participants_booking ON booking.booking_participants (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_participants_customer ON booking.booking_participants (customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_participants_status ON booking.booking_participants (participant_status, attendance_status);
