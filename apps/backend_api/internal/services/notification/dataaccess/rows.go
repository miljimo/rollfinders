package dataaccess

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

type queryer interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func notificationSelectSQL() string {
	return `
SELECT n.id, n.client_scope, COALESCE(n.idempotency_key, ''), n.channel::text, n.priority::text, n.status::text,
       COALESCE(em.subject, ''), COALESCE(em.content_text, ''), COALESCE(em.is_content_html, false),
       COALESCE(em.from_email, ''), COALESCE(em.from_name, ''), COALESCE(em.reply_to_email, ''), COALESCE(em.reply_to_name, ''),
       n.metadata, COALESCE(n.provider_name, ''), COALESCE(n.provider_message_id, ''), COALESCE(n.provider_response, '{}'::jsonb),
       n.attempt_count, n.max_attempts, n.next_attempt_at, n.locked_at, COALESCE(n.locked_by, ''),
       COALESCE(n.last_error, ''), n.sent_at, n.created_at, n.updated_at
FROM notification.notifications n
LEFT JOIN notification.email_messages em ON em.notification_id = n.id
`
}

func getByID(ctx context.Context, q queryer, id string) (Notification, error) {
	items, err := queryNotifications(ctx, q, notificationSelectSQL()+"WHERE n.id = $1", id)
	if err != nil {
		return Notification{}, err
	}
	if len(items) == 0 {
		return Notification{}, ErrNotFound
	}
	notification := items[0]
	recipients, err := recipientsByNotificationID(ctx, q, id)
	if err != nil {
		return Notification{}, err
	}
	attachments, err := attachmentsByNotificationID(ctx, q, id)
	if err != nil {
		return Notification{}, err
	}
	attempts, err := attemptsByNotificationID(ctx, q, id)
	if err != nil {
		return Notification{}, err
	}
	notification.Recipients = recipients
	notification.Attachments = attachments
	notification.Attempts = attempts
	return notification, nil
}

func queryNotifications(ctx context.Context, q queryer, query string, args ...any) ([]Notification, error) {
	rows, err := q.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Notification{}
	for rows.Next() {
		var item Notification
		var metadata, providerResponse []byte
		var lockedAt, sentAt sql.NullTime
		err := rows.Scan(
			&item.ID, &item.ClientScope, &item.IdempotencyKey, &item.Channel, &item.Priority, &item.Status,
			&item.Subject, &item.ContentText, &item.IsContentHTML, &item.FromEmail, &item.FromName, &item.ReplyToEmail, &item.ReplyToName,
			&metadata, &item.ProviderName, &item.ProviderMessageID, &providerResponse,
			&item.AttemptCount, &item.MaxAttempts, &item.NextAttemptAt, &lockedAt, &item.LockedBy,
			&item.LastError, &sentAt, &item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		item.Metadata = decodeMap(metadata)
		item.ProviderResponse = decodeMap(providerResponse)
		item.LockedAt = lockedAt.Time
		item.SentAt = sentAt.Time
		items = append(items, item)
	}
	return items, rows.Err()
}

func recipientsByNotificationID(ctx context.Context, q queryer, notificationID string) ([]Recipient, error) {
	rows, err := q.QueryContext(ctx, `
SELECT id, notification_id, recipient_type::text, email, COALESCE(name, ''), created_at
FROM notification.email_recipients
WHERE notification_id = $1
ORDER BY created_at, id`, notificationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Recipient{}
	for rows.Next() {
		var item Recipient
		if err := rows.Scan(&item.ID, &item.NotificationID, &item.RecipientType, &item.Email, &item.Name, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func attachmentsByNotificationID(ctx context.Context, q queryer, notificationID string) ([]Attachment, error) {
	rows, err := q.QueryContext(ctx, `
SELECT id, notification_id, filename, COALESCE(content_type, ''), COALESCE(size_bytes, 0), storage_url, metadata, created_at
FROM notification.notification_attachments
WHERE notification_id = $1
ORDER BY created_at, id`, notificationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Attachment{}
	for rows.Next() {
		var item Attachment
		var metadata []byte
		if err := rows.Scan(&item.ID, &item.NotificationID, &item.Filename, &item.ContentType, &item.SizeBytes, &item.StorageURL, &metadata, &item.CreatedAt); err != nil {
			return nil, err
		}
		item.Metadata = decodeMap(metadata)
		items = append(items, item)
	}
	return items, rows.Err()
}

func attemptsByNotificationID(ctx context.Context, q queryer, notificationID string) ([]Attempt, error) {
	rows, err := q.QueryContext(ctx, `
SELECT id, notification_id, attempt_number, COALESCE(provider_name, ''), COALESCE(provider_message_id, ''),
       status::text, COALESCE(error, ''), COALESCE(provider_response, '{}'::jsonb), started_at, completed_at, created_at
FROM notification.notification_attempts
WHERE notification_id = $1
ORDER BY attempt_number`, notificationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Attempt{}
	for rows.Next() {
		var item Attempt
		var response []byte
		var completedAt sql.NullTime
		if err := rows.Scan(&item.ID, &item.NotificationID, &item.AttemptNumber, &item.ProviderName, &item.ProviderMessageID, &item.Status, &item.Error, &response, &item.StartedAt, &completedAt, &item.CreatedAt); err != nil {
			return nil, err
		}
		item.ProviderResponse = decodeMap(response)
		item.CompletedAt = completedAt.Time
		items = append(items, item)
	}
	return items, rows.Err()
}

func jsonBytes(value map[string]any) ([]byte, error) {
	if value == nil {
		value = map[string]any{}
	}
	return json.Marshal(value)
}

func decodeMap(data []byte) map[string]any {
	if len(data) == 0 {
		return map[string]any{}
	}
	var value map[string]any
	if err := json.Unmarshal(data, &value); err != nil {
		return map[string]any{}
	}
	return value
}

func nullableInt64(value int64) any {
	if value == 0 {
		return nil
	}
	return value
}

func nullableTime(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value
}
