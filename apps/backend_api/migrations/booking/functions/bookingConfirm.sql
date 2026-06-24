CREATE OR REPLACE FUNCTION booking."bookingConfirm"(p_booking_id text, p_reason text)
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
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY SELECT * FROM booking."bookingStatusSet"(p_booking_id, 'confirmed', COALESCE(p_reason, 'booking_confirmed'));
END;
$$;
