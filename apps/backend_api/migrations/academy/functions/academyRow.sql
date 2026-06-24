CREATE OR REPLACE FUNCTION academy.academyRow(academyId TEXT)
RETURNS TABLE (
  id TEXT,
  organisation_id TEXT,
  application_id TEXT,
  name TEXT,
  slug TEXT,
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
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  listing_status TEXT,
  verification_status TEXT,
  is_featured BOOLEAN,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    a.id,
    a.organisation_id,
    a.application_id,
    a.name,
    a.slug,
    a.description,
    a.contact_email,
    a.contact_phone,
    a.website_url,
    a.image_url,
    a.address_line1,
    a.address_line2,
    a.city,
    a.region,
    a.postcode,
    a.country,
    a.latitude,
    a.longitude,
    a.listing_status::TEXT,
    a.verification_status::TEXT,
    a.is_featured,
    a.settings,
    a.created_at,
    a.updated_at
  FROM academy.academies a
  WHERE a.id = academyId;
$$;
