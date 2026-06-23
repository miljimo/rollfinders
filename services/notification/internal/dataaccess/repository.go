package dataaccess

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const DefaultMaxAttempts = 5

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, input CreateNotificationInput) (Notification, bool, error) {
	if input.MaxAttempts == 0 {
		input.MaxAttempts = DefaultMaxAttempts
	}
	if input.NextAttemptAt.IsZero() {
		input.NextAttemptAt = time.Now().UTC()
	}

	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return Notification{}, false, err
	}
	defer rollback(tx)

	if input.IdempotencyKey != "" {
		existingID, err := findByIdempotencyKey(ctx, tx, input.ClientScope, input.IdempotencyKey)
		if err != nil {
			return Notification{}, false, err
		}
		if existingID != "" {
			notification, err := getByID(ctx, tx, existingID)
			return notification, true, err
		}
	}

	metadata, err := jsonBytes(input.Metadata)
	if err != nil {
		return Notification{}, false, err
	}
	_, err = tx.ExecContext(ctx, `
INSERT INTO notification.notifications (
	id, client_scope, idempotency_key, channel, priority, status, metadata, max_attempts, next_attempt_at
) VALUES ($1,$2,NULLIF($3,''),$4::notification.notification_channel,$5::notification.notification_priority,'QUEUED',$6,$7,$8)`,
		input.ID, input.ClientScope, input.IdempotencyKey, input.Channel, input.Priority, metadata, input.MaxAttempts, input.NextAttemptAt)
	if err != nil {
		if strings.Contains(err.Error(), "uq_notification_notifications_idempotency") {
			_ = tx.Rollback()
			existingID, findErr := findByIdempotencyKey(ctx, r.db, input.ClientScope, input.IdempotencyKey)
			if findErr != nil {
				return Notification{}, false, findErr
			}
			notification, getErr := r.Get(ctx, existingID)
			return notification, true, getErr
		}
		return Notification{}, false, err
	}

	if input.Channel == "EMAIL" {
		_, err = tx.ExecContext(ctx, `
INSERT INTO notification.email_messages (
	notification_id, subject, content_text, is_content_html, from_email, from_name, reply_to_email, reply_to_name
) VALUES ($1,$2,$3,$4,$5,NULLIF($6,''),NULLIF($7,''),NULLIF($8,''))`,
			input.ID, input.Subject, input.ContentText, input.IsContentHTML, input.FromEmail, input.FromName, input.ReplyToEmail, input.ReplyToName)
		if err != nil {
			return Notification{}, false, err
		}
	}

	for _, recipient := range input.Recipients {
		_, err = tx.ExecContext(ctx, `
INSERT INTO notification.email_recipients (id, notification_id, recipient_type, email, name)
VALUES ($1,$2,$3::notification.notification_recipient_type,$4,NULLIF($5,''))`,
			recipient.ID, input.ID, recipient.RecipientType, recipient.Email, recipient.Name)
		if err != nil {
			return Notification{}, false, err
		}
	}

	for _, attachment := range input.Attachments {
		attachmentMetadata, err := jsonBytes(attachment.Metadata)
		if err != nil {
			return Notification{}, false, err
		}
		_, err = tx.ExecContext(ctx, `
INSERT INTO notification.notification_attachments (id, notification_id, filename, content_type, size_bytes, storage_url, metadata)
VALUES ($1,$2,$3,NULLIF($4,''),$5,$6,$7)`,
			attachment.ID, input.ID, attachment.Filename, attachment.ContentType, nullableInt64(attachment.SizeBytes), attachment.StorageURL, attachmentMetadata)
		if err != nil {
			return Notification{}, false, err
		}
	}

	if err := tx.Commit(); err != nil {
		return Notification{}, false, err
	}

	notification, err := r.Get(ctx, input.ID)
	return notification, false, err
}

func (r *Repository) Get(ctx context.Context, id string) (Notification, error) {
	return getByID(ctx, r.db, id)
}

func (r *Repository) Search(ctx context.Context, filter SearchFilter) ([]Notification, error) {
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	args := []any{}
	where := []string{"1=1"}
	add := func(clause string, value any) {
		args = append(args, value)
		where = append(where, fmt.Sprintf(clause, len(args)))
	}
	if filter.Status != "" {
		add("n.status = $%d::notification.notification_status", filter.Status)
	}
	if filter.Channel != "" {
		add("n.channel = $%d::notification.notification_channel", filter.Channel)
	}
	if filter.RecipientEmail != "" {
		add("EXISTS (SELECT 1 FROM notification.email_recipients r WHERE r.notification_id = n.id AND lower(r.email) = lower($%d))", filter.RecipientEmail)
	}
	if filter.SourceService != "" {
		add("n.metadata->>'sourceService' = $%d", filter.SourceService)
	}
	if !filter.CreatedFrom.IsZero() {
		add("n.created_at >= $%d", filter.CreatedFrom)
	}
	if !filter.CreatedTo.IsZero() {
		add("n.created_at < $%d", filter.CreatedTo)
	}
	args = append(args, filter.Limit, filter.Offset)
	query := fmt.Sprintf(notificationSelectSQL()+`
WHERE %s
ORDER BY n.created_at DESC, n.id DESC
LIMIT $%d OFFSET $%d`, strings.Join(where, " AND "), len(args)-1, len(args))
	return queryNotifications(ctx, r.db, query, args...)
}

func (r *Repository) LockDueWork(ctx context.Context, workerID string, limit int, now time.Time) ([]Notification, error) {
	if limit <= 0 {
		limit = 10
	}
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer rollback(tx)

	rows, err := tx.QueryContext(ctx, `
WITH due AS (
	SELECT id
	FROM notification.notifications
	WHERE status IN ('QUEUED', 'FAILED_RETRYABLE', 'RETRYING')
	  AND next_attempt_at <= $1
	  AND attempt_count < max_attempts
	ORDER BY
	  CASE priority
	    WHEN 'CRITICAL' THEN 1
	    WHEN 'HIGH' THEN 2
	    WHEN 'NORMAL' THEN 3
	    WHEN 'LOW' THEN 4
	    WHEN 'BULK' THEN 5
	  END,
	  next_attempt_at,
	  created_at
	FOR UPDATE SKIP LOCKED
	LIMIT $2
)
UPDATE notification.notifications n
SET status = 'PROCESSING', locked_at = $1, locked_by = $3, updated_at = now()
FROM due
WHERE n.id = due.id
RETURNING n.id`, now, limit, workerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	items := make([]Notification, 0, len(ids))
	for _, id := range ids {
		notification, err := r.Get(ctx, id)
		if err != nil {
			return nil, err
		}
		items = append(items, notification)
	}
	return items, nil
}

func (r *Repository) SetStatus(ctx context.Context, id, status, lastError string, nextAttemptAt time.Time) error {
	_, err := r.db.ExecContext(ctx, `
UPDATE notification.notifications
SET status = $2::notification.notification_status,
    last_error = NULLIF($3, ''),
    next_attempt_at = CASE WHEN $4::timestamptz IS NULL THEN next_attempt_at ELSE $4 END,
    locked_at = NULL,
    locked_by = NULL,
    updated_at = now()
WHERE id = $1`, id, status, lastError, nullableTime(nextAttemptAt))
	return err
}

func (r *Repository) RecordAttempt(ctx context.Context, update AttemptUpdate) (Notification, error) {
	if update.CompletedAt.IsZero() {
		update.CompletedAt = time.Now().UTC()
	}
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return Notification{}, err
	}
	defer rollback(tx)

	var attemptNumber int
	response, err := jsonBytes(update.ProviderResponse)
	if err != nil {
		return Notification{}, err
	}

	err = tx.QueryRowContext(ctx, `
UPDATE notification.notifications
SET attempt_count = attempt_count + 1,
    status = $2::notification.notification_status,
    provider_name = NULLIF($3, ''),
    provider_message_id = NULLIF($4, ''),
    provider_response = $5,
    last_error = NULLIF($6, ''),
    sent_at = CASE WHEN $2 = 'SENT' THEN $8 ELSE sent_at END,
    next_attempt_at = CASE WHEN $7::timestamptz IS NULL THEN next_attempt_at ELSE $7 END,
    locked_at = NULL,
    locked_by = NULL,
    updated_at = now()
WHERE id = $1
RETURNING attempt_count`,
		update.NotificationID, update.Status, update.ProviderName, update.ProviderMessageID, response,
		update.Error, nullableTime(update.NextAttemptAt), update.CompletedAt).Scan(&attemptNumber)
	if err != nil {
		return Notification{}, err
	}

	_, err = tx.ExecContext(ctx, `
INSERT INTO notification.notification_attempts (
	id, notification_id, attempt_number, provider_name, provider_message_id, status, error, provider_response, completed_at
) VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,''),
	CASE WHEN $6 = 'RETRYING' THEN 'FAILED_RETRYABLE' ELSE $6 END::notification.notification_attempt_status,
	NULLIF($7,''),$8,$9)`,
		update.AttemptID, update.NotificationID, attemptNumber, update.ProviderName, update.ProviderMessageID,
		update.Status, update.Error, response, update.CompletedAt)
	if err != nil {
		return Notification{}, err
	}
	if err := tx.Commit(); err != nil {
		return Notification{}, err
	}
	return r.Get(ctx, update.NotificationID)
}

func findByIdempotencyKey(ctx context.Context, q queryer, scope, key string) (string, error) {
	var id string
	err := q.QueryRowContext(ctx, `
SELECT id FROM notification.notifications
WHERE client_scope = $1 AND idempotency_key = $2`, scope, key).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	return id, err
}

func rollback(tx *sql.Tx) {
	_ = tx.Rollback()
}
