CREATE OR REPLACE FUNCTION payment_history_list(
    p_client_id text DEFAULT NULL,
    p_resource_type text DEFAULT NULL,
    p_resource_id text DEFAULT NULL,
    p_payer_user_id text DEFAULT NULL,
    p_payer_email text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_limit integer DEFAULT 100
)
RETURNS TABLE (
    payment_id text,
    amount_minor bigint,
    currency char(3),
    provider text,
    payment_method_type text,
    capture_method text,
    status text,
    refunded_amount_minor bigint,
    external_reference text,
    metadata jsonb,
    provider_payment_id text,
    provider_raw_status text,
    payment_created_at timestamptz,
    payment_updated_at timestamptz,
    checkout_session_id text,
    client_id text,
    client_state text,
    resource_type text,
    resource_id text,
    resource_label text,
    payer_user_id text,
    payer_email text
)
LANGUAGE sql
STABLE
SET search_path TO payments, public
AS $$
    SELECT
        p.id,
        p.amount_minor,
        p.currency,
        p.provider,
        p.payment_method_type,
        p.capture_method,
        p.status,
        p.refunded_amount_minor,
        p.external_reference,
        p.metadata,
        p.provider_payment_id,
        p.provider_raw_status,
        p.created_at,
        p.updated_at,
        c.id,
        c.client_id,
        c.client_state,
        c.resource_type,
        c.resource_id,
        c.resource_label,
        c.payer_user_id,
        c.payer_email
    FROM payments p
    LEFT JOIN checkouts c ON c.payment_id = p.id
    WHERE (p_client_id IS NULL OR c.client_id = p_client_id)
      AND (p_resource_type IS NULL OR c.resource_type = p_resource_type)
      AND (p_resource_id IS NULL OR c.resource_id = p_resource_id)
      AND (p_payer_user_id IS NULL OR c.payer_user_id = p_payer_user_id OR p.metadata->>'payer_user_id' = p_payer_user_id)
      AND (p_payer_email IS NULL OR c.payer_email = p_payer_email OR p.metadata->>'payer_email' = p_payer_email)
      AND (p_status IS NULL OR p.status = p_status)
    ORDER BY p.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 100);
$$;
