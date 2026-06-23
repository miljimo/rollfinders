CREATE TABLE IF NOT EXISTS notification.email_messages (
    notification_id text PRIMARY KEY REFERENCES notification.notifications(id) ON DELETE CASCADE,
    subject text NOT NULL,
    content_text text NOT NULL,
    is_content_html boolean NOT NULL DEFAULT false,
    from_email text NOT NULL,
    from_name text,
    reply_to_email text,
    reply_to_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (length(content_text) > 0),
    CHECK (position('@' in from_email) > 1),
    CHECK (reply_to_email IS NULL OR position('@' in reply_to_email) > 1)
);

CREATE INDEX IF NOT EXISTS idx_notification_email_messages_from
    ON notification.email_messages (lower(from_email));
