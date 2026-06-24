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
