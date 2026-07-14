CREATE OR REPLACE FUNCTION wallet.create_linked_wallet_account(
    p_id text,
    p_wallet_id text,
    p_provider text,
    p_provider_account_id text,
    p_connection_type text,
    p_status text,
    p_display_name text,
    p_external_reference text,
    p_currency text,
    p_created_at timestamptz,
    p_updated_at timestamptz
)
RETURNS TABLE (
    id text,
    wallet_id text,
    provider text,
    provider_account_id text,
    connection_type text,
    status text,
    display_name text,
    external_reference text,
    currency text,
    connected_wallet_count bigint,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_provider_account_ref_id text;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM wallet.wallets w
        WHERE w.id = p_wallet_id
          AND w.wallet_type = 'external'
    ) THEN
        RAISE EXCEPTION 'external wallet not found';
    END IF;

    IF COALESCE(NULLIF(p_provider_account_id, ''), '') <> '' THEN
        INSERT INTO wallet.provider_accounts (
            id,
            provider,
            provider_account_id,
            status,
            display_name,
            external_reference,
            currency,
            created_at,
            updated_at
        )
        VALUES (
            'wpa_' || substr(md5(p_provider || ':' || p_provider_account_id), 1, 24),
            p_provider,
            p_provider_account_id,
            p_status,
            NULLIF(p_display_name, ''),
            NULLIF(p_external_reference, ''),
            p_currency,
            p_created_at,
            p_updated_at
        )
        ON CONFLICT ON CONSTRAINT wallet_provider_accounts_provider_account_key DO UPDATE
        SET status = CASE
                WHEN EXCLUDED.status = 'DISABLED' AND EXISTS (
                    SELECT 1
                    FROM wallet.linked_wallet_accounts connected
                    WHERE connected.provider_account_ref_id = wallet.provider_accounts.id
                      AND connected.status = 'CONNECTED'
                      AND connected.wallet_id <> p_wallet_id
                ) THEN wallet.provider_accounts.status
                ELSE EXCLUDED.status
            END,
            display_name = COALESCE(EXCLUDED.display_name, wallet.provider_accounts.display_name),
            external_reference = COALESCE(EXCLUDED.external_reference, wallet.provider_accounts.external_reference),
            currency = EXCLUDED.currency,
            updated_at = EXCLUDED.updated_at
        RETURNING wallet.provider_accounts.id INTO v_provider_account_ref_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM wallet.linked_wallet_accounts a
        WHERE a.wallet_id = p_wallet_id
          AND a.provider = p_provider
    ) THEN
        UPDATE wallet.linked_wallet_accounts lwa
        SET provider_account_ref_id = COALESCE(v_provider_account_ref_id, lwa.provider_account_ref_id),
            connection_type = p_connection_type,
            status = p_status,
            updated_at = p_updated_at
        WHERE lwa.id = (
            SELECT a.id
            FROM wallet.linked_wallet_accounts a
            WHERE a.wallet_id = p_wallet_id
              AND a.provider = p_provider
            ORDER BY a.created_at DESC
            LIMIT 1
        );
    ELSE
        INSERT INTO wallet.linked_wallet_accounts (
            id,
            wallet_id,
            provider,
            provider_account_ref_id,
            connection_type,
            status,
            created_at,
            updated_at
        )
        VALUES (
            p_id,
            p_wallet_id,
            p_provider,
            v_provider_account_ref_id,
            p_connection_type,
            p_status,
            p_created_at,
            p_updated_at
        );
    END IF;

    IF p_status = 'CONNECTED' THEN
        UPDATE wallet.wallets
        SET status = 'active',
            updated_at = p_updated_at
        WHERE wallet.wallets.id = p_wallet_id;
    ELSIF p_status IN ('DISABLED', 'FAILED') THEN
        UPDATE wallet.wallets
        SET status = 'inactive',
            updated_at = p_updated_at
        WHERE wallet.wallets.id = p_wallet_id;
    END IF;

    RETURN QUERY
    SELECT a.id, a.wallet_id, a.provider, COALESCE(pa.provider_account_id, ''),
           a.connection_type, a.status, COALESCE(pa.display_name, ''),
           COALESCE(pa.external_reference, ''), COALESCE(pa.currency, w.currency),
           (
               SELECT count(*)::bigint
               FROM wallet.linked_wallet_accounts connected
               WHERE connected.provider_account_ref_id = a.provider_account_ref_id
                 AND connected.status = 'CONNECTED'
           ),
           a.created_at, a.updated_at
    FROM wallet.linked_wallet_accounts a
    JOIN wallet.wallets w ON w.id = a.wallet_id
    LEFT JOIN wallet.provider_accounts pa ON pa.id = a.provider_account_ref_id
    WHERE a.wallet_id = p_wallet_id
      AND a.provider = p_provider
    ORDER BY a.updated_at DESC
    LIMIT 1;
END;
$$;
