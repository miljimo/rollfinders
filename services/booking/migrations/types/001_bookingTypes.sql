DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'booking'::regnamespace AND typname = 'booking_status') THEN
        CREATE TYPE booking.booking_status AS ENUM ('pending', 'payment_pending', 'payment_received', 'confirmed', 'cancelled', 'completed');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumtypid = 'booking.booking_status'::regtype
          AND enumlabel = 'payment_received'
    ) THEN
        ALTER TYPE booking.booking_status ADD VALUE 'payment_received' AFTER 'payment_pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'booking'::regnamespace AND typname = 'participant_status') THEN
        CREATE TYPE booking.participant_status AS ENUM ('active', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'booking'::regnamespace AND typname = 'attendance_status') THEN
        CREATE TYPE booking.attendance_status AS ENUM ('unknown', 'present', 'absent');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'booking'::regnamespace AND typname = 'outbox_status') THEN
        CREATE TYPE booking.outbox_status AS ENUM ('pending', 'processing', 'published', 'failed');
    END IF;
END $$;
