CREATE OR REPLACE PROCEDURE "accountDeletionRequestCreateAuthenticated"(
    p_id text,
    p_user_id text
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    UPDATE account_deletion_requests
    SET source = 'AUTHENTICATED_DASHBOARD',
        status = 'PENDING_PROCESSING',
        token_hash = NULL,
        token_expires_at = NULL,
        verified_at = now(),
        due_at = now() + interval '1 month',
        cancelled_at = NULL,
        updated_at = now()
    WHERE user_id = p_user_id
      AND status = 'PENDING_VERIFICATION';

    IF NOT FOUND THEN
        INSERT INTO account_deletion_requests (
            id,
            user_id,
            source,
            status,
            verified_at,
            due_at
        )
        VALUES (
            p_id,
            p_user_id,
            'AUTHENTICATED_DASHBOARD',
            'PENDING_PROCESSING',
            now(),
            now() + interval '1 month'
        )
        ON CONFLICT (user_id) WHERE status IN ('PENDING_VERIFICATION', 'PENDING_PROCESSING')
        DO NOTHING;
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE "accountDeletionRequestCreatePublic"(
    p_id text,
    p_user_id text,
    p_token_hash text,
    p_token_expires_at timestamptz
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    UPDATE account_deletion_requests
    SET token_hash = p_token_hash,
        token_expires_at = p_token_expires_at,
        requested_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id
      AND status = 'PENDING_VERIFICATION';

    IF NOT FOUND THEN
        INSERT INTO account_deletion_requests (
            id,
            user_id,
            source,
            status,
            token_hash,
            token_expires_at
        )
        VALUES (
            p_id,
            p_user_id,
            'VERIFIED_PUBLIC_WEB',
            'PENDING_VERIFICATION',
            p_token_hash,
            p_token_expires_at
        )
        ON CONFLICT (user_id) WHERE status IN ('PENDING_VERIFICATION', 'PENDING_PROCESSING')
        DO NOTHING;
    END IF;
END;
$$;
