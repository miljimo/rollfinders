CREATE TABLE IF NOT EXISTS organisations (
    id text PRIMARY KEY,
    name text NOT NULL,
    status "OrganisationStatus" NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organisations_status_idx ON organisations (status);
