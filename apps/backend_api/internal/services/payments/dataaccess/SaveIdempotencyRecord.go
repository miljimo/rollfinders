package dataaccess

import (
	"context"
	"time"

	"rollfinders/internal/services/payments/databases"
)

func SaveIdempotencyRecord(ctx context.Context, db databases.DataContext, scope string, key string, fingerprint string, status int, responseJSON string, resourceID interface{}, expiresAt time.Time) error {
	_, err := db.Procedure(
		ctx,
		`payments."idempotencyRecordSave"`,
		scope,
		key,
		fingerprint,
		status,
		responseJSON,
		resourceID,
		expiresAt,
	)
	return err
}
