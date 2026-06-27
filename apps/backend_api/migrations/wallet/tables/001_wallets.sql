CREATE TABLE IF NOT EXISTS wallet.wallets (
    id text PRIMARY KEY,
    owner_type text NOT NULL CHECK (owner_type IN ('platform', 'academy', 'user', 'event', 'system')),
    owner_id text NOT NULL,
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'suspended', 'closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
