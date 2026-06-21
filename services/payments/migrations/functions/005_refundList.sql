CREATE OR REPLACE FUNCTION "refundList"(p_payment_id text)
RETURNS SETOF refunds
LANGUAGE sql
STABLE
SET search_path TO payments, public
AS $$
    SELECT *
    FROM refunds
    WHERE payment_id = p_payment_id
    ORDER BY created_at ASC;
$$;
