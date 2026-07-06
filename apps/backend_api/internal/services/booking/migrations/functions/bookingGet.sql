CREATE OR REPLACE FUNCTION booking."bookingGet"(p_booking_id text)
RETURNS TABLE(
    id text,
    reference text,
    bookable_type text,
    bookable_id text,
    bookable_instance_id text,
    customer_id text,
    guest_reference text,
    organisation_id text,
    payment_id text,
    status text,
    participant_count integer,
    metadata jsonb,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
AS $$
    SELECT
        b.id,
        b.reference,
        b.bookable_type,
        b.bookable_id,
        b.bookable_instance_id,
        b.customer_id,
        b.guest_reference,
        b.organisation_id,
        b.payment_id,
        b.status::text,
        b.participant_count,
        b.metadata,
        b.created_at,
        b.updated_at
    FROM booking.bookings b
    WHERE b.id = p_booking_id;
$$;
