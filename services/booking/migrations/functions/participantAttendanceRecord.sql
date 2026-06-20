CREATE OR REPLACE FUNCTION booking."participantAttendanceRecord"(
    p_booking_id text,
    p_participant_id text,
    p_attendance_status text
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

    IF NOT EXISTS (SELECT 1 FROM booking.booking_participants p WHERE p.id = p_participant_id AND p.booking_id = p_booking_id) THEN
        RAISE EXCEPTION 'participant_not_found';
    END IF;

    UPDATE booking.booking_participants
    SET attendance_status = p_attendance_status::booking.attendance_status,
        updated_at = now()
    WHERE booking.booking_participants.id = p_participant_id
      AND booking.booking_participants.booking_id = p_booking_id;

    RETURN QUERY SELECT * FROM booking."participantRow"(p_participant_id);
END;
$$;
