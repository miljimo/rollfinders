CREATE OR REPLACE FUNCTION "payoutRequestGet"(p_id text)
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
    WHERE id = p_id;
$$;
