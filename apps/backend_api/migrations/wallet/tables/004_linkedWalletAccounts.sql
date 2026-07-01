CREATE TABLE IF NOT EXISTS wallet.linked_wallet_accounts (
    id text PRIMARY KEY,
    wallet_id text NOT NULL REFERENCES wallet.wallets(id),
    provider text NOT NULL CHECK (provider IN ('STRIPE', 'PAYPAL', 'CARD', 'BANK')),
    provider_account_id text,
    connection_type text NOT NULL CHECK (connection_type IN ('TOPUP', 'PAYOUT', 'BOTH')),
    status text NOT NULL CHECK (status IN ('PENDING', 'CONNECTED', 'FAILED', 'DISABLED')),
    display_name text,
    external_reference text,
    currency text NOT NULL CHECK (currency IN ('GBP', 'Points')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_linked_wallet_accounts_wallet_idx ON wallet.linked_wallet_accounts(wallet_id);
CREATE INDEX IF NOT EXISTS wallet_linked_wallet_accounts_provider_idx ON wallet.linked_wallet_accounts(provider, provider_account_id);
