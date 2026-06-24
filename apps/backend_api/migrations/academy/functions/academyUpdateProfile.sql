CREATE OR REPLACE FUNCTION academy.academyUpdateProfile(
  academyId TEXT,
  academyName TEXT,
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
  UPDATE academy.academies
  SET
    name = COALESCE(NULLIF(academyName, ''), name),
    description = academyDescription,
    contact_email = contactEmail,
    contact_phone = contactPhone,
    website_url = websiteUrl,
    image_url = imageUrl,
    address_line1 = addressLine1,
    address_line2 = addressLine2,
    city = academyCity,
    region = academyRegion,
    postcode = academyPostcode,
    country = COALESCE(NULLIF(academyCountry, ''), country),
    latitude = academyLatitude,
    longitude = academyLongitude,
    verification_status = CASE
      WHEN academyVerificationStatus = 'verified' THEN 'verified'::academy.academy_verification_status
      WHEN academyVerificationStatus = 'rejected' THEN 'rejected'::academy.academy_verification_status
      WHEN academyVerificationStatus = 'submitted' THEN 'submitted'::academy.academy_verification_status
      ELSE verification_status
    END,
    is_featured = COALESCE(academyIsFeatured, is_featured),
    settings = COALESCE(academySettings, settings),
    updated_at = now()
  WHERE id = academyId;

  RETURN QUERY SELECT * FROM academy.academies WHERE id = academyId;
END;
$$;
