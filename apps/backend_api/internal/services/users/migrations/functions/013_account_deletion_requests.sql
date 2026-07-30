CREATE OR REPLACE FUNCTION account_deletion_request_get_active(p_user_id text)
RETURNS TABLE (
    id text,
    user_id text,
    source text,
    status text,
    requested_at timestamptz,
    verified_at timestamptz,
    due_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT
        request.id,
        request.user_id,
        request.source,
        request.status,
        request.requested_at,
        request.verified_at,
        request.due_at,
        request.cancelled_at,
        request.created_at,
        request.updated_at
    FROM account_deletion_requests request
    WHERE request.user_id = p_user_id
      AND request.status IN ('PENDING_VERIFICATION', 'PENDING_PROCESSING')
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION account_deletion_request_verification_matches(
    p_user_id text,
    p_token_hash text
)
RETURNS TABLE (matches boolean)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM account_deletion_requests
        WHERE user_id = p_user_id
          AND status = 'PENDING_VERIFICATION'
          AND token_hash = p_token_hash
          AND token_expires_at > now()
    );
$$;

CREATE OR REPLACE FUNCTION account_deletion_request_confirm(p_token_hash text)
RETURNS TABLE (
    id text,
    user_id text,
    source text,
    status text,
    requested_at timestamptz,
    verified_at timestamptz,
    due_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz,
    email text,
    name text
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    RETURN QUERY
    WITH confirmed AS (
        UPDATE account_deletion_requests request
        SET status = 'PENDING_PROCESSING',
            token_hash = NULL,
            token_expires_at = NULL,
            verified_at = now(),
            due_at = now() + interval '1 month',
            updated_at = now()
        WHERE request.token_hash = p_token_hash
          AND request.status = 'PENDING_VERIFICATION'
          AND request.token_expires_at > now()
        RETURNING request.*
    )
    SELECT
        confirmed.id,
        confirmed.user_id,
        confirmed.source,
        confirmed.status,
        confirmed.requested_at,
        confirmed.verified_at,
        confirmed.due_at,
        confirmed.cancelled_at,
        confirmed.created_at,
        confirmed.updated_at,
        credential.credential_identifier,
        NULLIF(account.display_name, '')
    FROM confirmed
    JOIN users account ON account.id = confirmed.user_id
    JOIN credentials credential ON credential.user_id = account.id
      AND credential.credential_type = 'EMAIL_PASSWORD'
      AND credential.status = 'ACTIVE'
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION account_deletion_request_cancel(p_user_id text)
RETURNS TABLE (
    id text,
    user_id text,
    source text,
    status text,
    requested_at timestamptz,
    verified_at timestamptz,
    due_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    RETURN QUERY
    UPDATE account_deletion_requests request
    SET status = 'CANCELLED',
        token_hash = NULL,
        token_expires_at = NULL,
        cancelled_at = now(),
        updated_at = now()
    WHERE request.user_id = p_user_id
      AND request.status IN ('PENDING_VERIFICATION', 'PENDING_PROCESSING')
    RETURNING
        request.id,
        request.user_id,
        request.source,
        request.status,
        request.requested_at,
        request.verified_at,
        request.due_at,
        request.cancelled_at,
        request.created_at,
        request.updated_at;
END;
$$;
