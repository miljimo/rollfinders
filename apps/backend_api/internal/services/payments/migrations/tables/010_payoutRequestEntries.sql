CREATE TABLE IF NOT EXISTS payout_request_entries (
    id text PRIMARY KEY,
    payout_request_id text NOT NULL REFERENCES payout_requests(id) ON DELETE CASCADE,
    payment_id text NOT NULL REFERENCES payments(id),
    amount_minor bigint NOT NULL CHECK (amount_minor > 0),
    currency char(3) NOT NULL,
    status text NOT NULL DEFAULT 'reserved',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (payout_request_id, payment_id)
);

CREATE INDEX IF NOT EXISTS payout_request_entries_open_payment_idx
ON payout_request_entries(payment_id, status);
