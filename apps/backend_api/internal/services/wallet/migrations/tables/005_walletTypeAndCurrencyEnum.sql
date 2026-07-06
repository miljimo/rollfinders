ALTER TABLE wallet.wallets
    ADD COLUMN IF NOT EXISTS wallet_type text;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'wallet'
          AND table_name = 'wallets'
          AND column_name = 'owner_type'
    ) THEN
        UPDATE wallet.wallets
        SET wallet_type = CASE
            WHEN owner_type IN ('platform', 'system') THEN 'internal'
            ELSE 'external'
        END
        WHERE wallet_type IS NULL;
    ELSE
        UPDATE wallet.wallets
        SET wallet_type = 'external'
        WHERE wallet_type IS NULL;
    END IF;
END $$;

ALTER TABLE wallet.wallets
    ALTER COLUMN wallet_type SET NOT NULL,
    DROP CONSTRAINT IF EXISTS wallets_owner_type_check,
    DROP CONSTRAINT IF EXISTS wallets_wallet_type_check,
    DROP CONSTRAINT IF EXISTS wallets_currency_check,
    ADD CONSTRAINT wallets_wallet_type_check CHECK (wallet_type IN ('internal', 'external')),
    ADD CONSTRAINT wallets_currency_check CHECK (currency IN ('GBP', 'Points'));

ALTER TABLE wallet.wallets
    DROP COLUMN IF EXISTS owner_type;

ALTER TABLE wallet.wallet_transactions
    DROP CONSTRAINT IF EXISTS wallet_transactions_currency_check,
    DROP CONSTRAINT IF EXISTS wallet_transactions_type_check,
    ADD CONSTRAINT wallet_transactions_currency_check CHECK (currency IN ('GBP', 'Points')),
    ADD CONSTRAINT wallet_transactions_type_check CHECK (type IN (
        'TRANSFER',
        'REVERSAL',
        'MANUAL_CREDIT',
        'MANUAL_DEBIT',
        'REFUND',
        'COMMISSION',
        'SUBSCRIPTION',
        'BOOKING_PAYMENT',
        'REWARD',
        'BONUS',
        'SYSTEM_ADJUSTMENT'
    ));

ALTER TABLE wallet.wallet_ledger_entries
    DROP CONSTRAINT IF EXISTS wallet_ledger_entries_currency_check,
    ADD CONSTRAINT wallet_ledger_entries_currency_check CHECK (currency IN ('GBP', 'Points'));

DROP INDEX IF EXISTS wallet.wallet_wallets_owner_idx;
CREATE INDEX IF NOT EXISTS wallet_wallets_owner_idx ON wallet.wallets(owner_id);
CREATE INDEX IF NOT EXISTS wallet_wallets_type_currency_idx ON wallet.wallets(wallet_type, currency);

DROP TABLE IF EXISTS wallet.wallet_reservations;
