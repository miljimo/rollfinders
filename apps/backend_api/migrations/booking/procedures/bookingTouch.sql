CREATE OR REPLACE PROCEDURE booking.bookingTouch(
    IN p_booking_id text
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE booking.bookings
    SET updated_at = now()
    WHERE id = p_booking_id;
END;
$$;
