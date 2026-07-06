CREATE TABLE IF NOT EXISTS payout_requests (
    id text PRIMARY KEY,
    client_id text NOT NULL,
    payee_id text NOT NULL,
    amount_minor bigint NOT NULL CHECK (amount_minor > 0),
    currency char(3) NOT NULL,
    status text NOT NULL,
    destination_account_id text NOT NULL,
    requested_by text,
    actor_id text,
    provider_reference text,
    reason text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_requests_payee_idx
ON payout_requests(payee_id, currency, status);

CREATE INDEX IF NOT EXISTS payout_requests_client_idx
ON payout_requests(client_id, created_at DESC);
