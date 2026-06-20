CREATE TABLE IF NOT EXISTS booking.bookings (
    id text PRIMARY KEY,
    reference text NOT NULL UNIQUE,
    bookable_type text NOT NULL,
    bookable_id text NOT NULL,
    bookable_instance_id text NOT NULL,
    customer_id text,
    guest_reference text,
    organisation_id text NOT NULL,
    payment_id text,
    status booking.booking_status NOT NULL DEFAULT 'pending',
    participant_count integer NOT NULL DEFAULT 1 CHECK (participant_count > 0),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (customer_id IS NOT NULL OR guest_reference IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_booking_bookings_customer ON booking.bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_bookings_organisation ON booking.bookings (organisation_id);
CREATE INDEX IF NOT EXISTS idx_booking_bookings_bookable_instance ON booking.bookings (bookable_type, bookable_instance_id);
CREATE INDEX IF NOT EXISTS idx_booking_bookings_payment ON booking.bookings (payment_id);
CREATE INDEX IF NOT EXISTS idx_booking_bookings_status ON booking.bookings (status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_active_customer_instance
    ON booking.bookings (bookable_type, bookable_instance_id, customer_id)
    WHERE customer_id IS NOT NULL AND status IN ('pending', 'payment_pending', 'confirmed');
