CREATE TABLE IF NOT EXISTS checkouts (
    id text PRIMARY KEY,
    client_id text NOT NULL REFERENCES payment_clients(id),
    client_state text,
    payment_id text NOT NULL REFERENCES payments(id),
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    resource_label text,
    amount_minor bigint NOT NULL CHECK (amount_minor > 0),
    currency char(3) NOT NULL,
    payer_user_id text,
    payer_email text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    success_url text NOT NULL,
    cancel_url text NOT NULL,
    checkout_url text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
