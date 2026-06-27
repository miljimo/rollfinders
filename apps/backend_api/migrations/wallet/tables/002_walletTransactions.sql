CREATE TABLE IF NOT EXISTS wallet.wallet_transactions (
    id text PRIMARY KEY,
    type text NOT NULL,
    status text NOT NULL,
    amount bigint NOT NULL CHECK (amount > 0),
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    source_wallet_id text REFERENCES wallet.wallets(id),
    destination_wallet_id text REFERENCES wallet.wallets(id),
    reference_type text,
    reference_id text,
    idempotency_key text UNIQUE,
    original_transaction_id text REFERENCES wallet.wallet_transactions(id),
    created_at timestamptz NOT NULL DEFAULT now()
);
