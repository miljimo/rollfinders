DO $$
BEGIN
  IF to_regclass('public.academies') IS NOT NULL THEN
    EXECUTE $function$
      CREATE OR REPLACE FUNCTION academy."rollfindersMirrorAcademy"()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $body$
      DECLARE
        legacy jsonb := COALESCE(NEW.settings -> 'legacy', '{}'::jsonb);
      BEGIN
        INSERT INTO public.academies (
          id,
          name,
          slug,
          description,
          affiliation,
          website,
          email,
          phone,
          address,
          city,
          postcode,
          borough,
          country,
          latitude,
          longitude,
          logo_url,
          cover_image_url,
          categories,
          facebook_url,
          instagram_url,
          x_url,
          drop_in_price,
          gi_available,
          nogi_available,
          beginner_friendly,
          competition_focused,
          verification_status,
          featured,
          verified,
          created_by_id,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          NEW.name,
          NEW.slug,
          COALESCE(NEW.description, ''),
          NULLIF(legacy ->> 'affiliation', ''),
          NULLIF(NEW.website_url, ''),
          NULLIF(NEW.contact_email, ''),
          NULLIF(NEW.contact_phone, ''),
          COALESCE(NULLIF(NEW.address_line1, ''), 'Not listed'),
          COALESCE(NULLIF(NEW.city, ''), 'Not listed'),
          COALESCE(NULLIF(NEW.postcode, ''), 'Not listed'),
          NULLIF(COALESCE(NEW.region, legacy ->> 'borough'), ''),
          COALESCE(NULLIF(NEW.country, ''), 'United Kingdom'),
          COALESCE(NEW.latitude::double precision, 0),
          COALESCE(NEW.longitude::double precision, 0),
          NULLIF(NEW.image_url, ''),
          NULLIF(legacy ->> 'coverImageUrl', ''),
          NULLIF(legacy ->> 'categories', ''),
          NULLIF(legacy ->> 'facebookUrl', ''),
          NULLIF(legacy ->> 'instagramUrl', ''),
          NULLIF(legacy ->> 'xUrl', ''),
          NULLIF(legacy ->> 'dropInPrice', '')::double precision,
          COALESCE((legacy ->> 'giAvailable')::boolean, true),
          COALESCE((legacy ->> 'nogiAvailable')::boolean, true),
          COALESCE((legacy ->> 'beginnerFriendly')::boolean, true),
          COALESCE((legacy ->> 'competitionFocused')::boolean, false),
          CASE
            WHEN NEW.verification_status::text = 'verified' THEN 'VERIFIED'::"AcademyVerificationStatus"
            WHEN NEW.verification_status::text = 'rejected' THEN 'REJECTED'::"AcademyVerificationStatus"
            ELSE 'PENDING'::"AcademyVerificationStatus"
          END,
          NEW.is_featured,
          NEW.verification_status::text = 'verified',
          NULLIF(legacy ->> 'createdById', ''),
          COALESCE(NEW.created_at, now()),
          COALESCE(NEW.updated_at, now())
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          description = EXCLUDED.description,
          affiliation = EXCLUDED.affiliation,
          website = EXCLUDED.website,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          postcode = EXCLUDED.postcode,
          borough = EXCLUDED.borough,
          country = EXCLUDED.country,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          logo_url = EXCLUDED.logo_url,
          cover_image_url = EXCLUDED.cover_image_url,
          categories = EXCLUDED.categories,
          facebook_url = EXCLUDED.facebook_url,
          instagram_url = EXCLUDED.instagram_url,
          x_url = EXCLUDED.x_url,
          drop_in_price = EXCLUDED.drop_in_price,
          gi_available = EXCLUDED.gi_available,
          nogi_available = EXCLUDED.nogi_available,
          beginner_friendly = EXCLUDED.beginner_friendly,
          competition_focused = EXCLUDED.competition_focused,
          verification_status = EXCLUDED.verification_status,
          featured = EXCLUDED.featured,
          verified = EXCLUDED.verified,
          created_by_id = EXCLUDED.created_by_id,
          updated_at = EXCLUDED.updated_at;

        RETURN NEW;
      END;
      $body$;
    $function$;

    DROP TRIGGER IF EXISTS rollfinders_mirror_academy ON academy.academies;
    CREATE TRIGGER rollfinders_mirror_academy
    AFTER INSERT OR UPDATE ON academy.academies
    FOR EACH ROW EXECUTE FUNCTION academy."rollfindersMirrorAcademy"();

    UPDATE academy.academies SET updated_at = updated_at;
  END IF;

  IF to_regclass('public.academy_members') IS NOT NULL THEN
    EXECUTE $function$
      CREATE OR REPLACE FUNCTION academy."rollfindersMirrorAcademyMember"()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $body$
      BEGIN
        INSERT INTO public.academy_members (
          id,
          academy_id,
          user_id,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          NEW.academy_id,
          NEW.user_id,
          COALESCE(NEW.created_at, now()),
          COALESCE(NEW.updated_at, now())
        )
        ON CONFLICT (academy_id, user_id) DO UPDATE SET
          updated_at = EXCLUDED.updated_at;

        RETURN NEW;
      END;
      $body$;
    $function$;

    EXECUTE $function$
      CREATE OR REPLACE FUNCTION academy."rollfindersRemoveMirroredAcademyMember"()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $body$
      BEGIN
        DELETE FROM public.academy_members
        WHERE academy_id = OLD.academy_id
          AND user_id = OLD.user_id;

        RETURN OLD;
      END;
      $body$;
    $function$;

    DROP TRIGGER IF EXISTS rollfinders_mirror_academy_member ON academy.academy_members;
    CREATE TRIGGER rollfinders_mirror_academy_member
    AFTER INSERT OR UPDATE ON academy.academy_members
    FOR EACH ROW EXECUTE FUNCTION academy."rollfindersMirrorAcademyMember"();

    DROP TRIGGER IF EXISTS rollfinders_remove_mirrored_academy_member ON academy.academy_members;
    CREATE TRIGGER rollfinders_remove_mirrored_academy_member
    AFTER DELETE ON academy.academy_members
    FOR EACH ROW EXECUTE FUNCTION academy."rollfindersRemoveMirroredAcademyMember"();

    UPDATE academy.academy_members SET updated_at = updated_at;
  END IF;
END $$;
