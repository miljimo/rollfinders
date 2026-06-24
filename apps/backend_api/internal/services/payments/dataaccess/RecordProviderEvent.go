package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func RecordProviderEvent(ctx context.Context, db databases.DataContext, provider string, id string) error {
	_, err := db.Procedure(ctx, `payments."providerEventRecord"`, provider, id, "{}")
	return err
}
