CREATE OR REPLACE FUNCTION wallet.create_wallet(
    p_id text,
    p_wallet_type text,
    p_owner_id text,
    p_currency text,
    p_status text,
    p_created_at timestamptz,
    p_updated_at timestamptz
)
RETURNS TABLE (
    id text,
    wallet_type text,
    owner_id text,
    currency text,
    status text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM wallet.wallets w
        WHERE w.owner_id = p_owner_id
          AND w.wallet_type = p_wallet_type
          AND w.currency = p_currency
    ) THEN
        RAISE EXCEPTION 'wallet already exists for this owner, type, and currency'
            USING ERRCODE = '23505',
                  CONSTRAINT = 'wallet_wallets_owner_type_currency_key';
    END IF;

    INSERT INTO wallet.wallets (id, wallet_type, owner_id, currency, status, created_at, updated_at)
    VALUES (p_id, p_wallet_type, p_owner_id, p_currency, p_status, p_created_at, p_updated_at);

    RETURN QUERY SELECT * FROM wallet.get_wallet(p_id);
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM wallet.wallets
        GROUP BY owner_id, wallet_type, currency
        HAVING count(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS wallet_wallets_owner_type_currency_key
            ON wallet.wallets (owner_id, wallet_type, currency);
    END IF;
END;
$$;
