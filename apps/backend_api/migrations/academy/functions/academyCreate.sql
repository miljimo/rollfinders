CREATE OR REPLACE FUNCTION academy.academyCreate(
  academyId TEXT,
  organisationId TEXT,
  applicationId TEXT,
  academyName TEXT,
  academySlug TEXT,
  academyDescription TEXT,
  contactEmail TEXT,
  contactPhone TEXT,
  websiteUrl TEXT,
  imageUrl TEXT,
  addressLine1 TEXT,
  addressLine2 TEXT,
  academyCity TEXT,
  academyRegion TEXT,
  academyPostcode TEXT,
  academyCountry TEXT,
  academyLatitude NUMERIC,
  academyLongitude NUMERIC,
  academyVerificationStatus TEXT,
  academyIsFeatured BOOLEAN,
  academySettings JSONB
)
RETURNS SETOF academy.academies
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO academy.academies (
    id,
    organisation_id,
    application_id,
    name,
    slug,
    description,
    contact_email,
    contact_phone,
    website_url,
    image_url,
    address_line1,
    address_line2,
    city,
    region,
    postcode,
    country,
    latitude,
    longitude,
    verification_status,
    is_featured,
    settings
  ) VALUES (
    academyId,
    organisationId,
    applicationId,
    academyName,
    academySlug,
    academyDescription,
    contactEmail,
    contactPhone,
    websiteUrl,
    imageUrl,
    addressLine1,
    addressLine2,
    academyCity,
    academyRegion,
    academyPostcode,
    COALESCE(NULLIF(academyCountry, ''), 'GB'),
    academyLatitude,
    academyLongitude,
    CASE
      WHEN academyVerificationStatus = 'verified' THEN 'verified'::academy.academy_verification_status
      WHEN academyVerificationStatus = 'rejected' THEN 'rejected'::academy.academy_verification_status
      WHEN academyVerificationStatus = 'submitted' THEN 'submitted'::academy.academy_verification_status
      ELSE 'unverified'::academy.academy_verification_status
    END,
    COALESCE(academyIsFeatured, false),
    COALESCE(academySettings, '{}'::jsonb)
  );

  RETURN QUERY SELECT * FROM academy.academies WHERE id = academyId;
END;
$$;
