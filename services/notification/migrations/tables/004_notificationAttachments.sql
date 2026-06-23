CREATE TABLE IF NOT EXISTS notification.notification_attachments (
    id text PRIMARY KEY,
    notification_id text NOT NULL REFERENCES notification.notifications(id) ON DELETE CASCADE,
    filename text NOT NULL,
    content_type text,
    size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
    storage_url text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_attachments_notification
    ON notification.notification_attachments (notification_id);
