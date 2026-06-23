CREATE TABLE IF NOT EXISTS permissions (
    id text PRIMARY KEY,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    organisation_id text,
    application_id text,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT permissions_code_scope_key UNIQUE NULLS NOT DISTINCT (code, organisation_id, application_id)
);

CREATE INDEX IF NOT EXISTS permissions_code_idx ON permissions (code);
