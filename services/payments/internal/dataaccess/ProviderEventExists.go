package dataaccess

import (
	"context"

	"payments/internal/databases"
)

func ProviderEventExists(ctx context.Context, db databases.DataContext, provider string, id string) (bool, error) {
	rows, err := db.Function(ctx, "payments.provider_event_exists", provider, id)
	if err != nil {
		return false, err
	}
	if len(rows) == 0 {
		return false, nil
	}
	return boolValue(firstValue(rows[0])), nil
}
