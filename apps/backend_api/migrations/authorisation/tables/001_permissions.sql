CREATE TABLE IF NOT EXISTS permissions (
    id text PRIMARY KEY,
    organisation_id text,
    application_id text,
    resource_id text NOT NULL REFERENCES resources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT permissions_resource_scope_key UNIQUE NULLS NOT DISTINCT (resource_id, organisation_id, application_id)
);

CREATE INDEX IF NOT EXISTS permissions_resource_id_idx ON permissions (resource_id);
