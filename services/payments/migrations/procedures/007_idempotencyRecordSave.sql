CREATE OR REPLACE PROCEDURE "idempotencyRecordSave"(
    p_scope text,
    p_key text,
    p_request_fingerprint text,
    p_status_code integer,
    p_response_body jsonb,
    p_resource_id text,
    p_expires_at timestamptz
)
LANGUAGE plpgsql
SET search_path TO payments, public
AS $$
BEGIN
    INSERT INTO idempotency_keys (
        scope,
        key,
        request_fingerprint,
        status_code,
        response_body,
        resource_id,
        expires_at
    )
    VALUES (
        p_scope,
        p_key,
        p_request_fingerprint,
        p_status_code,
        p_response_body,
        p_resource_id,
        p_expires_at
    )
    ON CONFLICT (scope, key) DO UPDATE
    SET status_code = EXCLUDED.status_code,
        response_body = EXCLUDED.response_body,
        resource_id = EXCLUDED.resource_id,
        expires_at = EXCLUDED.expires_at,
        updated_at = now();
END;
$$;
