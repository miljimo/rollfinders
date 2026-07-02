CREATE TABLE IF NOT EXISTS wallet.wallets (
    id text PRIMARY KEY,
    wallet_type text NOT NULL CHECK (wallet_type IN ('internal', 'external')),
    owner_id text NOT NULL,
    currency text NOT NULL CHECK (currency IN ('GBP', 'Points')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen', 'suspended', 'closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
