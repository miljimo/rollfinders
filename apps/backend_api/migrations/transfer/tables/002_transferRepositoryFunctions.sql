DROP FUNCTION IF EXISTS transfer.create_transfer_request(TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS transfer.get_transfer_request(TEXT);
DROP FUNCTION IF EXISTS transfer.list_transfer_requests(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS transfer.mark_transfer_processing(TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS transfer.complete_transfer_request(TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS transfer.complete_transfer_request(TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS transfer.fail_transfer_request(TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION transfer.create_transfer_request(
    p_id TEXT,
    p_source_wallet_id TEXT,
    p_destination_wallet_id TEXT,
    p_amount BIGINT,
    p_currency TEXT,
    p_reference_type TEXT,
    p_reference_id TEXT,
    p_description TEXT,
    p_idempotency_key TEXT,
    p_now TIMESTAMPTZ
)
RETURNS TABLE (
    id TEXT,
    status TEXT,
    source_wallet_id TEXT,
    destination_wallet_id TEXT,
    amount BIGINT,
    currency TEXT,
    reference_type TEXT,
    reference_id TEXT,
    description TEXT,
    idempotency_key TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO transfer.transfer_requests AS inserted_transfer (
        id,
        status,
        source_wallet_id,
        destination_wallet_id,
        amount,
        currency,
        reference_type,
        reference_id,
        description,
        idempotency_key,
        created_at,
        updated_at
    )
    VALUES (
        p_id,
        'PENDING',
        p_source_wallet_id,
        p_destination_wallet_id,
        p_amount,
        p_currency,
        NULLIF(p_reference_type, ''),
        NULLIF(p_reference_id, ''),
        NULLIF(p_description, ''),
        p_idempotency_key,
        p_now,
        p_now
    )
    ON CONFLICT ON CONSTRAINT transfer_requests_idempotency_key_unique DO UPDATE
        SET updated_at = inserted_transfer.updated_at
    RETURNING
        inserted_transfer.id,
        inserted_transfer.status,
        inserted_transfer.source_wallet_id,
        inserted_transfer.destination_wallet_id,
        inserted_transfer.amount,
        inserted_transfer.currency,
        inserted_transfer.reference_type,
        inserted_transfer.reference_id,
        inserted_transfer.description,
        inserted_transfer.idempotency_key,
        inserted_transfer.failure_reason,
        inserted_transfer.created_at,
        inserted_transfer.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION transfer.get_transfer_request(p_id TEXT)
RETURNS TABLE (
    id TEXT,
    status TEXT,
    source_wallet_id TEXT,
    destination_wallet_id TEXT,
    amount BIGINT,
    currency TEXT,
    reference_type TEXT,
    reference_id TEXT,
    description TEXT,
    idempotency_key TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
    SELECT
        id,
        status,
        source_wallet_id,
        destination_wallet_id,
        amount,
        currency,
        reference_type,
        reference_id,
        description,
        idempotency_key,
        failure_reason,
        created_at,
        updated_at
    FROM transfer.transfer_requests
    WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION transfer.list_transfer_requests(
    p_wallet_id TEXT,
    p_limit INTEGER,
    p_offset INTEGER
)
RETURNS TABLE (
    id TEXT,
    status TEXT,
    source_wallet_id TEXT,
    destination_wallet_id TEXT,
    amount BIGINT,
    currency TEXT,
    reference_type TEXT,
    reference_id TEXT,
    description TEXT,
    idempotency_key TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        id,
        status,
        source_wallet_id,
        destination_wallet_id,
        amount,
        currency,
        reference_type,
        reference_id,
        description,
        idempotency_key,
        failure_reason,
        created_at,
        updated_at
    FROM transfer.transfer_requests
    WHERE NULLIF(p_wallet_id, '') IS NULL
       OR source_wallet_id = p_wallet_id
       OR destination_wallet_id = p_wallet_id
    ORDER BY created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 100))
    OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

CREATE OR REPLACE FUNCTION transfer.mark_transfer_processing(p_id TEXT, p_now TIMESTAMPTZ)
RETURNS SETOF transfer.transfer_requests
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE transfer.transfer_requests
    SET status = 'PROCESSING',
        updated_at = p_now
    WHERE id = p_id
      AND status IN ('PENDING', 'PROCESSING')
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION transfer.complete_transfer_request(
    p_id TEXT,
    p_now TIMESTAMPTZ
)
RETURNS SETOF transfer.transfer_requests
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE transfer.transfer_requests
    SET status = 'COMPLETED',
        failure_reason = NULL,
        updated_at = p_now
    WHERE id = p_id
      AND status IN ('PENDING', 'PROCESSING', 'COMPLETED')
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION transfer.fail_transfer_request(
    p_id TEXT,
    p_failure_reason TEXT,
    p_now TIMESTAMPTZ
)
RETURNS SETOF transfer.transfer_requests
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE transfer.transfer_requests
    SET status = 'FAILED',
        failure_reason = NULLIF(p_failure_reason, ''),
        updated_at = p_now
    WHERE id = p_id
      AND status IN ('PENDING', 'PROCESSING', 'FAILED')
    RETURNING *;
END;
$$;
