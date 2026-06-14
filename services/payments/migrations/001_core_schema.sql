CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS provider_events (
    provider text NOT NULL,
    provider_event_id text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
    scope text NOT NULL,
    key text NOT NULL,
    request_fingerprint text NOT NULL,
    status_code integer,
    response_body jsonb,
    resource_id text,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (scope, key)
);

CREATE TABLE IF NOT EXISTS payment_status_history (
    id bigserial PRIMARY KEY,
    payment_id text NOT NULL REFERENCES payments(id),
    from_status text,
    to_status text NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox_events (
    id text PRIMARY KEY,
    event_type text NOT NULL,
    aggregate_id text NOT NULL,
    payload jsonb NOT NULL,
    delivered_at timestamptz,
    attempts integer NOT NULL DEFAULT 0,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations(version) VALUES ('001_core_schema')
ON CONFLICT (version) DO NOTHING;
