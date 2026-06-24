CREATE OR REPLACE FUNCTION booking."participantCreate"(
    p_id text,
    p_booking_id text,
    p_customer_id text,
    p_guest_reference text,
    p_display_name text,
    p_metadata jsonb
)
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
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM booking.bookings b WHERE b.id = p_booking_id) THEN
        RAISE EXCEPTION 'booking_not_found';
    END IF;

    INSERT INTO booking.booking_participants (
        id,
        booking_id,
        customer_id,
        guest_reference,
        display_name,
        metadata
    )
    VALUES (
        p_id,
        p_booking_id,
        p_customer_id,
        p_guest_reference,
        p_display_name,
        COALESCE(p_metadata, '{}'::jsonb)
    );

    RETURN QUERY SELECT * FROM booking."participantRow"(p_id);
END;
$$;
