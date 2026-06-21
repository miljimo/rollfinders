package dataaccess

import (
	"context"

	"payments/internal/databases"
)

func GetIdempotencyRecord(ctx context.Context, db databases.DataContext, scope string, key string) (IdempotencyRecord, error) {
	row, err := firstRow(db.Function(ctx, `payments."idempotencyGet"`, scope, key))
	if err != nil {
		return IdempotencyRecord{}, err
	}
	return IdempotencyRecordFromRow(row), nil
}
