CREATE TABLE IF NOT EXISTS notification.notification_attempts (
    id text PRIMARY KEY,
    notification_id text NOT NULL REFERENCES notification.notifications(id) ON DELETE CASCADE,
    attempt_number integer NOT NULL CHECK (attempt_number > 0),
    provider_name text,
    provider_message_id text,
    status notification.notification_attempt_status NOT NULL,
    error text,
    provider_response jsonb,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (notification_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_notification_attempts_notification
    ON notification.notification_attempts (notification_id, attempt_number);

CREATE INDEX IF NOT EXISTS idx_notification_attempts_status
    ON notification.notification_attempts (status);
