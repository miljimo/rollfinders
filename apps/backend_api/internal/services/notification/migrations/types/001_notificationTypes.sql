DO $$
BEGIN
    CREATE TYPE notification.notification_channel AS ENUM ('EMAIL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE notification.notification_priority AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'BULK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE notification.notification_status AS ENUM (
        'CREATED',
        'QUEUED',
        'PROCESSING',
        'SENT',
        'FAILED_RETRYABLE',
        'RETRYING',
        'FAILED_PERMANENT'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE notification.notification_recipient_type AS ENUM ('TO', 'CC', 'BCC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE notification.notification_attempt_status AS ENUM ('PROCESSING', 'SENT', 'FAILED_RETRYABLE', 'FAILED_PERMANENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE notification.outbox_status AS ENUM ('pending', 'published', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
