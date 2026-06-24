CREATE OR REPLACE FUNCTION "refundList"(p_payment_id text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
RETURNS SETOF refunds
LANGUAGE sql
STABLE
SET search_path TO payments, public
AS $$
    SELECT *
    FROM refunds
    WHERE payment_id = p_payment_id
    ORDER BY created_at ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;
