CREATE TABLE IF NOT EXISTS refunds (
    id text PRIMARY KEY,
    payment_id text NOT NULL REFERENCES payments(id),
    amount_minor bigint NOT NULL CHECK (amount_minor > 0),
    currency char(3) NOT NULL,
    status text NOT NULL,
    reason text,
    provider_refund_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
