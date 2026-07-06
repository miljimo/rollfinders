DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'courses'::regnamespace AND typname = 'course_status') THEN
        CREATE TYPE course_status AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'DELETED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'courses'::regnamespace AND typname = 'session_status') THEN
        CREATE TYPE session_status AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');
    END IF;
END $$;
