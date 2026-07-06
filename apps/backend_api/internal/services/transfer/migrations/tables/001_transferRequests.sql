CREATE TABLE IF NOT EXISTS transfer.transfer_requests (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    source_wallet_id TEXT NOT NULL,
    destination_wallet_id TEXT NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL,
    reference_type TEXT NULL,
    reference_id TEXT NULL,
    description TEXT NULL,
    idempotency_key TEXT NOT NULL,
    failure_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT transfer_requests_idempotency_key_unique UNIQUE (idempotency_key),
    CONSTRAINT transfer_requests_wallets_different CHECK (source_wallet_id <> destination_wallet_id),
    CONSTRAINT transfer_requests_status_check CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    CONSTRAINT transfer_requests_currency_check CHECK (currency IN ('GBP', 'Points'))
);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_status_created_at
    ON transfer.transfer_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_source_wallet
    ON transfer.transfer_requests (source_wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_destination_wallet
    ON transfer.transfer_requests (destination_wallet_id, created_at DESC);
