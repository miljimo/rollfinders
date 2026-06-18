CREATE OR REPLACE FUNCTION payment_get(p_payment_id text)
RETURNS SETOF payments
LANGUAGE sql
STABLE
SET search_path TO payments, public
AS $$
    SELECT *
    FROM payments
    WHERE id = p_payment_id;
$$;
