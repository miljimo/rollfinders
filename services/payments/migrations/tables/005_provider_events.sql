CREATE TABLE IF NOT EXISTS provider_events (
    provider text NOT NULL,
    provider_event_id text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, provider_event_id)
);
