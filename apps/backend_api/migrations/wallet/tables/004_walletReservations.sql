CREATE TABLE IF NOT EXISTS wallet.wallet_reservations (
    id text PRIMARY KEY,
    wallet_id text NOT NULL REFERENCES wallet.wallets(id),
    transaction_id text NOT NULL REFERENCES wallet.wallet_transactions(id),
    amount bigint NOT NULL CHECK (amount > 0),
    status text NOT NULL CHECK (status IN ('ACTIVE', 'RELEASED', 'CAPTURED', 'EXPIRED')),
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
