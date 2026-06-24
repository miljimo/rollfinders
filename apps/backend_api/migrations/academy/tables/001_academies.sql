CREATE TABLE IF NOT EXISTS academy.academies (
  id TEXT PRIMARY KEY,
  organisation_id TEXT,
  application_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,
  image_url TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  region TEXT,
  postcode TEXT,
  country TEXT NOT NULL DEFAULT 'GB',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  listing_status academy.academy_listing_status NOT NULL DEFAULT 'draft',
  verification_status academy.academy_verification_status NOT NULL DEFAULT 'unverified',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academies_organisation_idx ON academy.academies (organisation_id);
CREATE INDEX IF NOT EXISTS academies_listing_status_idx ON academy.academies (listing_status);
CREATE INDEX IF NOT EXISTS academies_verification_status_idx ON academy.academies (verification_status);
