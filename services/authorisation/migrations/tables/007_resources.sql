CREATE TABLE IF NOT EXISTS resources (
    id text PRIMARY KEY,
    resource_type text NOT NULL,
    display_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resources_resource_type_idx ON resources (resource_type);
