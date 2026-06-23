CREATE TABLE IF NOT EXISTS organisation_resource_links (
    id text PRIMARY KEY,
    organisation_id text NOT NULL REFERENCES organisations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    application_id text REFERENCES applications(id) ON UPDATE CASCADE ON DELETE CASCADE,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, application_id, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS organisation_resource_links_resource_idx
    ON organisation_resource_links (resource_type, resource_id);
