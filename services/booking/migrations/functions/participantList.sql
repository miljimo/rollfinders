CREATE OR REPLACE FUNCTION booking."participantList"(p_booking_id text)
RETURNS TABLE(
    id text,
    booking_id text,
    customer_id text,
    guest_reference text,
    display_name text,
    participant_status text,
    attendance_status text,
    metadata jsonb,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
AS $$
    SELECT
        p.id,
        p.booking_id,
        p.customer_id,
        p.guest_reference,
        p.display_name,
        p.participant_status::text,
        p.attendance_status::text,
        p.metadata,
        p.created_at,
        p.updated_at
    FROM booking.booking_participants p
    WHERE p.booking_id = p_booking_id
    ORDER BY p.created_at ASC;
$$;
