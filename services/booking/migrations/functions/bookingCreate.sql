CREATE OR REPLACE FUNCTION booking."bookingCreate"(
    p_id text,
    p_reference text,
    p_bookable_type text,
    p_bookable_id text,
    p_bookable_instance_id text,
    p_customer_id text,
    p_guest_reference text,
    p_organisation_id text,
    p_participant_count integer,
    p_metadata jsonb,
    p_payment_required boolean
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
    v_status booking.booking_status;
BEGIN
    v_status := CASE WHEN p_payment_required THEN 'payment_pending'::booking.booking_status ELSE 'confirmed'::booking.booking_status END;

    INSERT INTO booking.bookings (
        id,
        reference,
        bookable_type,
        bookable_id,
        bookable_instance_id,
        customer_id,
        guest_reference,
        organisation_id,
        status,
        participant_count,
        metadata
    )
    VALUES (
        p_id,
        p_reference,
        p_bookable_type,
        p_bookable_id,
        p_bookable_instance_id,
        p_customer_id,
        p_guest_reference,
        p_organisation_id,
        v_status,
        p_participant_count,
        COALESCE(p_metadata, '{}'::jsonb)
    );

    INSERT INTO booking.booking_participants (
        id,
        booking_id,
        customer_id,
        guest_reference,
        participant_status,
        attendance_status,
        metadata
    )
    VALUES (
        'participant_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
        p_id,
        p_customer_id,
        p_guest_reference,
        'active',
        'unknown',
        '{}'::jsonb
    );

    INSERT INTO booking.booking_status_history (id, booking_id, from_status, to_status, reason)
    VALUES ('history_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16), p_id, NULL, v_status, 'booking_created');

    INSERT INTO booking.outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status)
    VALUES (
        'outbox_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
        'booking',
        p_id,
        'booking.created',
        jsonb_build_object('booking_id', p_id, 'status', v_status::text),
        'pending'
    );

    RETURN QUERY SELECT * FROM booking."bookingRow"(p_id);
END;
$$;
