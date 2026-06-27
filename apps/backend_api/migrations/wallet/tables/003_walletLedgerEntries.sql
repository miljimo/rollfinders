CREATE TABLE IF NOT EXISTS wallet.wallet_ledger_entries (
    id text PRIMARY KEY,
    transaction_id text NOT NULL REFERENCES wallet.wallet_transactions(id),
    wallet_id text NOT NULL REFERENCES wallet.wallets(id),
    debit_amount bigint NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount bigint NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
);
