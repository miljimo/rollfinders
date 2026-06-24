package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func ProviderEventExists(ctx context.Context, db databases.DataContext, provider string, id string) (bool, error) {
	rows, err := db.Function(ctx, `payments."providerEventExists"`, provider, id)
	if err != nil {
		return false, err
	}
	if len(rows) == 0 {
		return false, nil
	}
	return boolValue(firstValue(rows[0])), nil
}
