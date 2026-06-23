CREATE TABLE IF NOT EXISTS application_service_permissions (
    application_id text NOT NULL,
    service_key text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (application_id, service_key)
);

CREATE INDEX IF NOT EXISTS application_service_permissions_service_key_idx ON application_service_permissions (service_key);
