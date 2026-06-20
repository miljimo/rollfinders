CREATE OR REPLACE FUNCTION booking."bookingStatusSet"(
    p_booking_id text,
    p_status text,
    p_reason text
)
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
    v_old_status booking.booking_status;
    v_new_status booking.booking_status;
BEGIN
    SELECT b.status INTO v_old_status
    FROM booking.bookings b
    WHERE b.id = p_booking_id
    FOR UPDATE;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'booking_not_found';
    END IF;

    v_new_status := p_status::booking.booking_status;

    IF v_old_status = v_new_status THEN
        RETURN QUERY SELECT * FROM booking."bookingRow"(p_booking_id);
        RETURN;
    END IF;

    IF v_old_status = 'cancelled' OR v_old_status = 'completed' THEN
        RAISE EXCEPTION 'invalid_status_transition';
    END IF;

    IF v_new_status = 'confirmed' AND v_old_status NOT IN ('pending', 'payment_pending') THEN
        RAISE EXCEPTION 'invalid_status_transition';
    END IF;

    UPDATE booking.bookings
    SET status = v_new_status,
        updated_at = now()
    WHERE booking.bookings.id = p_booking_id;

    INSERT INTO booking.booking_status_history (id, booking_id, from_status, to_status, reason)
    VALUES ('history_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16), p_booking_id, v_old_status, v_new_status, p_reason);

    INSERT INTO booking.outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status)
    VALUES (
        'outbox_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
        'booking',
        p_booking_id,
        'booking.' || v_new_status::text,
        jsonb_build_object('booking_id', p_booking_id, 'status', v_new_status::text),
        'pending'
    );

    RETURN QUERY SELECT * FROM booking."bookingRow"(p_booking_id);
END;
$$;
