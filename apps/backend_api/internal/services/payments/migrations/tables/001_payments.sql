CREATE TABLE IF NOT EXISTS payments (
    id text PRIMARY KEY,
    amount_minor bigint NOT NULL CHECK (amount_minor > 0),
    currency char(3) NOT NULL,
    provider text NOT NULL CHECK (provider IN ('stripe', 'paypal')),
    payment_method_type text NOT NULL,
    capture_method text NOT NULL DEFAULT 'automatic',
    status text NOT NULL,
    refunded_amount_minor bigint NOT NULL DEFAULT 0,
    external_reference text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    provider_payment_id text,
    provider_raw_status text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
