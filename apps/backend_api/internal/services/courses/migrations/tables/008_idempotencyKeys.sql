CREATE TABLE IF NOT EXISTS idempotency_keys (
    idempotency_key text PRIMARY KEY,
    request_hash text NOT NULL,
    response_status integer,
    response_body jsonb,
    resource_type text,
    resource_id text,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
