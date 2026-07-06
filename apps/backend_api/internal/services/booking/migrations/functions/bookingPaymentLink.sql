CREATE OR REPLACE FUNCTION booking."bookingPaymentLink"(p_booking_id text, p_payment_id text)
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
DECLARE
    v_booking booking.bookings%ROWTYPE;
BEGIN
    SELECT * INTO v_booking
    FROM booking.bookings b
    WHERE b.id = p_booking_id
    FOR UPDATE;

    IF v_booking.id IS NULL THEN
        RAISE EXCEPTION 'booking_not_found';
    END IF;

    IF v_booking.status <> 'payment_pending' THEN
        RAISE EXCEPTION 'invalid_payment_link';
    END IF;

    IF v_booking.payment_id IS NOT NULL AND v_booking.payment_id <> p_payment_id THEN
        RAISE EXCEPTION 'invalid_payment_link';
    END IF;

    UPDATE booking.bookings
    SET payment_id = p_payment_id,
        updated_at = now()
    WHERE booking.bookings.id = p_booking_id;

    RETURN QUERY SELECT * FROM booking."bookingRow"(p_booking_id);
END;
$$;
