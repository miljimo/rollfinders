CREATE SCHEMA IF NOT EXISTS wallet;

CREATE TABLE IF NOT EXISTS wallet.wallets (
    id text PRIMARY KEY,
    wallet_type text NOT NULL CHECK (wallet_type IN ('internal', 'external')),
    owner_id text NOT NULL,
    currency text NOT NULL CHECK (currency IN ('GBP', 'Points')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen', 'suspended', 'closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet.wallet_transactions (
    id text PRIMARY KEY,
    type text NOT NULL CHECK (type IN (
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
    )),
    status text NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED', 'CANCELLED')),
    amount bigint NOT NULL CHECK (amount > 0),
    currency text NOT NULL CHECK (currency IN ('GBP', 'Points')),
    source_wallet_id text REFERENCES wallet.wallets(id),
    destination_wallet_id text REFERENCES wallet.wallets(id),
    reference_type text,
    reference_id text,
    idempotency_key text UNIQUE,
    original_transaction_id text REFERENCES wallet.wallet_transactions(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet.wallet_ledger_entries (
    id text PRIMARY KEY,
    transaction_id text NOT NULL,
    wallet_id text NOT NULL REFERENCES wallet.wallets(id),
    debit_amount bigint NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount bigint NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
    currency text NOT NULL CHECK (currency IN ('GBP', 'Points')),
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
);

CREATE TABLE IF NOT EXISTS wallet.balance_snapshots (
    wallet_id text PRIMARY KEY REFERENCES wallet.wallets(id),
    available_balance bigint NOT NULL DEFAULT 0,
    reserved_balance bigint NOT NULL DEFAULT 0,
    pending_balance bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet.wallet_reservations (
    id text PRIMARY KEY,
    wallet_id text NOT NULL REFERENCES wallet.wallets(id),
    amount bigint NOT NULL CHECK (amount > 0),
    currency text NOT NULL CHECK (currency IN ('GBP', 'Points')),
    status text NOT NULL CHECK (status IN ('ACTIVE', 'RELEASED', 'FINALIZED')),
    reference_type text,
    reference_id text,
    idempotency_key text UNIQUE,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS wallet.linked_wallet_accounts (
    id text PRIMARY KEY,
    wallet_id text NOT NULL REFERENCES wallet.wallets(id),
    provider text NOT NULL CHECK (provider IN ('STRIPE', 'PAYPAL', 'CARD', 'BANK')),
    provider_account_ref_id text REFERENCES wallet.provider_accounts(id),
    connection_type text NOT NULL CHECK (connection_type IN ('TOPUP', 'PAYOUT', 'BOTH')),
    status text NOT NULL CHECK (status IN ('PENDING', 'CONNECTED', 'FAILED', 'DISABLED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet.wallet_audit_events (
    id text PRIMARY KEY,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    event_type text NOT NULL,
    actor_id text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet.outbox_events (
    id text PRIMARY KEY,
    event_type text NOT NULL,
    aggregate_id text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz
);

CREATE OR REPLACE FUNCTION wallet.prevent_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'wallet ledger entries are immutable';
END;
$$;

DROP TRIGGER IF EXISTS wallet_ledger_entries_no_update ON wallet.wallet_ledger_entries;
CREATE TRIGGER wallet_ledger_entries_no_update
BEFORE UPDATE OR DELETE ON wallet.wallet_ledger_entries
FOR EACH ROW EXECUTE FUNCTION wallet.prevent_ledger_mutation();

CREATE INDEX IF NOT EXISTS wallet_wallets_owner_idx ON wallet.wallets(owner_id);
CREATE INDEX IF NOT EXISTS wallet_wallets_type_currency_idx ON wallet.wallets(wallet_type, currency);
CREATE INDEX IF NOT EXISTS wallet_linked_wallet_accounts_wallet_idx ON wallet.linked_wallet_accounts(wallet_id);
CREATE INDEX IF NOT EXISTS wallet_linked_wallet_accounts_provider_idx ON wallet.linked_wallet_accounts(provider, provider_account_ref_id);
CREATE INDEX IF NOT EXISTS wallet_provider_accounts_provider_account_idx ON wallet.provider_accounts(provider, provider_account_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_source_idx ON wallet.wallet_transactions(source_wallet_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_destination_idx ON wallet.wallet_transactions(destination_wallet_id);
CREATE INDEX IF NOT EXISTS wallet_ledger_entries_wallet_idx ON wallet.wallet_ledger_entries(wallet_id);
CREATE INDEX IF NOT EXISTS wallet_reservations_wallet_status_idx ON wallet.wallet_reservations(wallet_id, status);
