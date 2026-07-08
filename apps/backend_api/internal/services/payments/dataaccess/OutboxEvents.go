package dataaccess

import (
	"context"
	"encoding/json"
	"time"

	"rollfinders/internal/services/payments/databases"
)

type OutboxEvent struct {
	ID          string
	Type        string
	AggregateID string
	Payload     map[string]any
	Delivered   bool
	Attempts    int
	LastError   string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func ListOutboxEvents(ctx context.Context, db databases.DataContext, eventType interface{}, limit int) ([]OutboxEvent, error) {
	rows, err := db.Query(ctx, `
		SELECT id, event_type, aggregate_id, payload, delivered_at IS NOT NULL AS delivered,
		       attempts, COALESCE(last_error, '') AS last_error, created_at, updated_at
		FROM outbox_events
		WHERE delivered_at IS NULL
		  AND ($1::text IS NULL OR event_type = $1::text)
		ORDER BY created_at ASC
		LIMIT LEAST(GREATEST($2::integer, 1), 100)
	`, eventType, limit)
	if err != nil {
		return nil, err
	}
	events := make([]OutboxEvent, 0, len(rows))
	for _, row := range rows {
		events = append(events, outboxEventFromRow(row))
	}
	return events, nil
}

func MarkOutboxDelivered(ctx context.Context, db databases.DataContext, id string) (bool, error) {
	affected, err := db.Execute(ctx, `
		UPDATE outbox_events
		SET delivered_at = COALESCE(delivered_at, now()),
		    attempts = attempts + 1,
		    last_error = NULL,
		    updated_at = now()
		WHERE id = $1
		  AND delivered_at IS NULL
	`, id)
	return affected > 0, err
}

func outboxEventFromRow(row map[string]interface{}) OutboxEvent {
	return OutboxEvent{
		ID:          stringValue(row["id"]),
		Type:        stringValue(row["event_type"]),
		AggregateID: stringValue(row["aggregate_id"]),
		Payload:     anyMapFromJSON(row["payload"]),
		Delivered:   boolValue(row["delivered"]),
		Attempts:    int(int64Value(row["attempts"])),
		LastError:   stringValue(row["last_error"]),
		CreatedAt:   timeValue(row["created_at"]),
		UpdatedAt:   timeValue(row["updated_at"]),
	}
}

func anyMapFromJSON(value interface{}) map[string]any {
	switch typed := value.(type) {
	case map[string]any:
		return typed
	case []byte:
		var out map[string]any
		if json.Unmarshal(typed, &out) == nil {
			return out
		}
	case string:
		var out map[string]any
		if json.Unmarshal([]byte(typed), &out) == nil {
			return out
		}
	}
	return map[string]any{}
}
