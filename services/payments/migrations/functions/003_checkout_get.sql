CREATE OR REPLACE FUNCTION checkout_get(p_checkout_id text)
RETURNS SETOF checkouts
LANGUAGE sql
STABLE
SET search_path TO payments, public
AS $$
    SELECT *
    FROM checkouts
    WHERE id = p_checkout_id;
$$;
