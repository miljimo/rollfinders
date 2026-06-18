CREATE OR REPLACE FUNCTION payment_client_get(p_client_id text)
RETURNS SETOF payment_clients
LANGUAGE sql
STABLE
SET search_path TO payments, public
AS $$
    SELECT *
    FROM payment_clients
    WHERE id = p_client_id;
$$;
