CREATE TABLE IF NOT EXISTS organisation_profiles (
    organisation_id text PRIMARY KEY REFERENCES organisations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    legal_name text,
    website text,
    email text,
    phone text,
    logo_url text,
    address jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
