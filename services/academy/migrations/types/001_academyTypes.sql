DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'academy_listing_status' AND typnamespace = 'academy'::regnamespace) THEN
    CREATE TYPE academy.academy_listing_status AS ENUM ('draft', 'published', 'archived', 'suspended');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'academy_verification_status' AND typnamespace = 'academy'::regnamespace) THEN
    CREATE TYPE academy.academy_verification_status AS ENUM ('unverified', 'submitted', 'verified', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'academy_claim_status' AND typnamespace = 'academy'::regnamespace) THEN
    CREATE TYPE academy.academy_claim_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'academy_invitation_status' AND typnamespace = 'academy'::regnamespace) THEN
    CREATE TYPE academy.academy_invitation_status AS ENUM ('pending', 'accepted', 'cancelled', 'expired');
  END IF;
END $$;
