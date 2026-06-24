CREATE TABLE IF NOT EXISTS applications (
    id text PRIMARY KEY,
    organisation_id text NOT NULL REFERENCES organisations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, slug)
);

CREATE INDEX IF NOT EXISTS applications_organisation_id_idx
    ON applications (organisation_id);
