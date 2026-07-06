CREATE OR REPLACE FUNCTION "payoutRequestList"(
    p_client_id text DEFAULT NULL,
    p_payee_id text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_currency char(3) DEFAULT NULL,
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id text,
    client_id text,
    payee_id text,
    amount_minor bigint,
    currency char(3),
    status text,
    destination_account_id text,
    requested_by text,
    actor_id text,
    provider_reference text,
    reason text,
    notes text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO payments, public
AS $$
    SELECT
        id,
        client_id,
        payee_id,
        amount_minor,
        currency,
        status,
        destination_account_id,
        requested_by,
        actor_id,
        provider_reference,
        reason,
        notes,
        created_at,
        updated_at
    FROM payout_requests
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND (p_payee_id IS NULL OR payee_id = p_payee_id)
      AND (p_status IS NULL OR status = p_status)
      AND (p_currency IS NULL OR currency = p_currency)
    ORDER BY created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;
