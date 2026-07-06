CREATE TABLE IF NOT EXISTS wallet.provider_accounts (
    id text PRIMARY KEY,
    provider text NOT NULL CHECK (provider IN ('STRIPE', 'PAYPAL', 'CARD', 'BANK')),
    provider_account_id text NOT NULL,
    status text NOT NULL CHECK (status IN ('PENDING', 'CONNECTED', 'FAILED', 'DISABLED')),
    display_name text,
    external_reference text,
    currency text NOT NULL CHECK (currency IN ('GBP', 'Points')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT wallet_provider_accounts_provider_account_key UNIQUE (provider, provider_account_id)
);

ALTER TABLE wallet.linked_wallet_accounts
    ADD COLUMN IF NOT EXISTS provider_account_ref_id text REFERENCES wallet.provider_accounts(id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'wallet'
          AND table_name = 'linked_wallet_accounts'
          AND column_name = 'provider_account_id'
    ) THEN
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
        SELECT DISTINCT ON (a.provider, a.provider_account_id)
            'wpa_' || substr(md5(a.provider || ':' || a.provider_account_id), 1, 24),
            a.provider,
            a.provider_account_id,
            a.status,
            a.display_name,
            a.external_reference,
            a.currency,
            a.created_at,
            a.updated_at
        FROM wallet.linked_wallet_accounts a
        WHERE a.provider_account_id IS NOT NULL
          AND a.provider_account_id <> ''
        ORDER BY a.provider, a.provider_account_id, a.updated_at DESC
        ON CONFLICT (provider, provider_account_id) DO UPDATE
        SET status = EXCLUDED.status,
            display_name = COALESCE(EXCLUDED.display_name, wallet.provider_accounts.display_name),
            external_reference = COALESCE(EXCLUDED.external_reference, wallet.provider_accounts.external_reference),
            currency = EXCLUDED.currency,
            updated_at = GREATEST(wallet.provider_accounts.updated_at, EXCLUDED.updated_at);

        UPDATE wallet.linked_wallet_accounts a
        SET provider_account_ref_id = pa.id
        FROM wallet.provider_accounts pa
        WHERE a.provider = pa.provider
          AND a.provider_account_id = pa.provider_account_id
          AND a.provider_account_ref_id IS DISTINCT FROM pa.id;
    END IF;
END $$;

DROP INDEX IF EXISTS wallet.wallet_linked_wallet_accounts_provider_idx;
CREATE INDEX IF NOT EXISTS wallet_linked_wallet_accounts_provider_idx
ON wallet.linked_wallet_accounts(provider, provider_account_ref_id);

CREATE INDEX IF NOT EXISTS wallet_provider_accounts_provider_account_idx
ON wallet.provider_accounts(provider, provider_account_id);

ALTER TABLE wallet.linked_wallet_accounts
    DROP COLUMN IF EXISTS provider_account_id,
    DROP COLUMN IF EXISTS display_name,
    DROP COLUMN IF EXISTS external_reference,
    DROP COLUMN IF EXISTS currency;
