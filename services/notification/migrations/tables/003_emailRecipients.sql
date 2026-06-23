CREATE TABLE IF NOT EXISTS notification.email_recipients (
    id text PRIMARY KEY,
    notification_id text NOT NULL REFERENCES notification.notifications(id) ON DELETE CASCADE,
    recipient_type notification.notification_recipient_type NOT NULL,
    email text NOT NULL,
    name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (position('@' in email) > 1)
);

CREATE INDEX IF NOT EXISTS idx_notification_email_recipients_notification
    ON notification.email_recipients (notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_email_recipients_email
    ON notification.email_recipients (lower(email));

CREATE INDEX IF NOT EXISTS idx_notification_email_recipients_type
    ON notification.email_recipients (recipient_type);
