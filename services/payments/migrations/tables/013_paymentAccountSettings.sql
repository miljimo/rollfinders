CREATE TABLE IF NOT EXISTS payment_account_settings (
    id text PRIMARY KEY,
    owner_type text NOT NULL,
    owner_id text NOT NULL,
    academy_id text,
    provider text NOT NULL DEFAULT 'stripe',
    provider_account_id text,
    status text NOT NULL DEFAULT 'pending',
    charges_enabled boolean NOT NULL DEFAULT false,
    payouts_enabled boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT payment_account_settings_owner_key UNIQUE (owner_type, owner_id, provider)
);

CREATE INDEX IF NOT EXISTS payment_account_settings_academy_idx
ON payment_account_settings(academy_id);

CREATE INDEX IF NOT EXISTS payment_account_settings_owner_idx
ON payment_account_settings(owner_type, owner_id);

CREATE INDEX IF NOT EXISTS payment_account_settings_provider_account_idx
ON payment_account_settings(provider_account_id);

DO $$
BEGIN
    IF to_regclass('public.payment_account_settings') IS NOT NULL THEN
        INSERT INTO payment_account_settings (
            id,
            owner_type,
            owner_id,
            academy_id,
            provider,
            provider_account_id,
            status,
            charges_enabled,
            payouts_enabled,
            created_at,
            updated_at
        )
        SELECT
            id,
            owner_type,
            owner_id,
            academy_id,
            provider,
            provider_account_id,
            status,
            charges_enabled,
            payouts_enabled,
            created_at,
            updated_at
        FROM public.payment_account_settings
        ON CONFLICT (owner_type, owner_id, provider) DO UPDATE
        SET academy_id = EXCLUDED.academy_id,
            provider_account_id = EXCLUDED.provider_account_id,
            status = EXCLUDED.status,
            charges_enabled = EXCLUDED.charges_enabled,
            payouts_enabled = EXCLUDED.payouts_enabled,
            updated_at = EXCLUDED.updated_at;
    END IF;
END $$;
