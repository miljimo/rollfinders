CREATE TABLE IF NOT EXISTS application_services (
    application_id text NOT NULL REFERENCES applications(id) ON UPDATE CASCADE ON DELETE CASCADE,
    service_key text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (application_id, service_key)
);

CREATE INDEX IF NOT EXISTS application_services_service_key_idx
    ON application_services (service_key);
