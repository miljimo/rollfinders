DO $$
BEGIN
  IF to_regclass('public.academies') IS NOT NULL THEN
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
      city,
      region,
      postcode,
      country,
      latitude,
      longitude,
      listing_status,
      verification_status,
      is_featured,
      settings,
      created_at,
      updated_at
    )
    SELECT
      a.id,
      a.id,
      COALESCE(current_setting('app.rollfinders_application_id', true), 'app_rollfinders'),
      a.name,
      a.slug,
      a.description,
      a.email,
      a.phone,
      a.website,
      COALESCE(a.logo_url, a.cover_image_url),
      a.address,
      a.city,
      a.borough,
      a.postcode,
      a.country,
      a.latitude,
      a.longitude,
      'published'::academy.academy_listing_status,
      CASE
        WHEN a.verification_status::TEXT = 'VERIFIED' THEN 'verified'::academy.academy_verification_status
        WHEN a.verification_status::TEXT = 'REJECTED' THEN 'rejected'::academy.academy_verification_status
        ELSE 'submitted'::academy.academy_verification_status
      END,
      a.featured,
      jsonb_build_object(
        'legacy', jsonb_build_object(
          'affiliation', a.affiliation,
          'borough', a.borough,
          'categories', a.categories,
          'coverImageUrl', a.cover_image_url,
          'dropInPrice', a.drop_in_price,
          'facebookUrl', a.facebook_url,
          'giAvailable', a.gi_available,
          'instagramUrl', a.instagram_url,
          'nogiAvailable', a.nogi_available,
          'beginnerFriendly', a.beginner_friendly,
          'competitionFocused', a.competition_focused,
          'verified', a.verified,
          'createdById', a.created_by_id,
          'xUrl', a.x_url
        )
      ),
      a.created_at,
      a.updated_at
    FROM public.academies a
    ON CONFLICT (id) DO UPDATE SET
      organisation_id = EXCLUDED.organisation_id,
      application_id = EXCLUDED.application_id,
      name = EXCLUDED.name,
      slug = EXCLUDED.slug,
      description = EXCLUDED.description,
      contact_email = EXCLUDED.contact_email,
      contact_phone = EXCLUDED.contact_phone,
      website_url = EXCLUDED.website_url,
      image_url = EXCLUDED.image_url,
      address_line1 = EXCLUDED.address_line1,
      city = EXCLUDED.city,
      region = EXCLUDED.region,
      postcode = EXCLUDED.postcode,
      country = EXCLUDED.country,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      listing_status = EXCLUDED.listing_status,
      verification_status = EXCLUDED.verification_status,
      is_featured = EXCLUDED.is_featured,
      settings = EXCLUDED.settings,
      updated_at = GREATEST(academy.academies.updated_at, EXCLUDED.updated_at);
  END IF;

  IF to_regclass('public.academy_members') IS NOT NULL THEN
    INSERT INTO academy.academy_members (
      id,
      academy_id,
      user_id,
      created_at,
      updated_at
    )
    SELECT
      m.id,
      m.academy_id,
      m.user_id,
      m.created_at,
      m.updated_at
    FROM public.academy_members m
    WHERE EXISTS (
      SELECT 1
      FROM academy.academies a
      WHERE a.id = m.academy_id
    )
    ON CONFLICT (academy_id, user_id) DO UPDATE SET
      updated_at = GREATEST(academy.academy_members.updated_at, EXCLUDED.updated_at);
  END IF;
END $$;
