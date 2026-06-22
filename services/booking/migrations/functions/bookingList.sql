CREATE OR REPLACE FUNCTION booking."bookingList"(
    p_customer_id text,
    p_guest_reference text,
    p_organisation_id text,
    p_bookable_type text,
    p_bookable_id text,
    p_bookable_instance_id text,
    p_payment_id text,
    p_status text,
    p_limit integer
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
    WHERE (p_customer_id IS NULL OR b.customer_id = p_customer_id)
      AND (p_guest_reference IS NULL OR b.guest_reference = p_guest_reference)
      AND (p_organisation_id IS NULL OR b.organisation_id = p_organisation_id)
      AND (p_bookable_type IS NULL OR b.bookable_type = p_bookable_type)
      AND (p_bookable_id IS NULL OR b.bookable_id = p_bookable_id)
      AND (p_bookable_instance_id IS NULL OR b.bookable_instance_id = p_bookable_instance_id)
      AND (p_payment_id IS NULL OR b.payment_id = p_payment_id)
      AND (p_status IS NULL OR b.status::text = p_status)
    ORDER BY b.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
$$;
