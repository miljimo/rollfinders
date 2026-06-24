CREATE OR REPLACE FUNCTION "idempotencyGet"(p_scope text, p_key text)
RETURNS SETOF idempotency_keys
LANGUAGE sql
STABLE
SET search_path TO payments, public
AS $$
    SELECT *
    FROM idempotency_keys
    WHERE scope = p_scope
      AND key = p_key;
$$;
