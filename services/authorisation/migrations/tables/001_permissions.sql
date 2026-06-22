CREATE TABLE IF NOT EXISTS permissions (
    id text PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS permissions_code_idx ON permissions (code);
