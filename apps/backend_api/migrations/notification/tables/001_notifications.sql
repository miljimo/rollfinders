CREATE TABLE IF NOT EXISTS notification.notifications (
    id text PRIMARY KEY,
    client_scope text NOT NULL,
    idempotency_key text,
    channel notification.notification_channel NOT NULL,
    priority notification.notification_priority NOT NULL DEFAULT 'NORMAL',
    status notification.notification_status NOT NULL DEFAULT 'QUEUED',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    provider_name text,
    provider_message_id text,
    provider_response jsonb,
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    locked_at timestamptz,
    locked_by text,
    last_error text,
    sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (idempotency_key IS NULL OR length(idempotency_key) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_notifications_idempotency
    ON notification.notifications (client_scope, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_notifications_queue
    ON notification.notifications (status, next_attempt_at, priority, created_at)
    WHERE status IN ('QUEUED', 'FAILED_RETRYABLE', 'RETRYING');

CREATE INDEX IF NOT EXISTS idx_notification_notifications_status
    ON notification.notifications (status);

CREATE INDEX IF NOT EXISTS idx_notification_notifications_channel
    ON notification.notifications (channel);

CREATE INDEX IF NOT EXISTS idx_notification_notifications_source_service
    ON notification.notifications ((metadata->>'sourceService'));

CREATE INDEX IF NOT EXISTS idx_notification_notifications_created_at
    ON notification.notifications (created_at);
