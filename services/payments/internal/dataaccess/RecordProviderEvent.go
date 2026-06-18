package dataaccess

import (
	"context"

	"payments/internal/databases"
)

func RecordProviderEvent(ctx context.Context, db databases.DataContext, provider string, id string) error {
	_, err := db.Procedure(ctx, `payments."providerEventRecord"`, provider, id, "{}")
	return err
}
