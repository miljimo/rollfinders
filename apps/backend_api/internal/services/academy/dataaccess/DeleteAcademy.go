package dataaccess

import (
	"context"

	"rollfinders/internal/services/academy/databases"
)

func DeleteAcademy(ctx context.Context, db databases.DataContext, academyID string) (Academy, error) {
	results, err := db.Function(ctx, "academy.academyDelete", academyID)
	if err != nil {
		return Academy{}, err
	}
	if len(results) == 0 {
		return Academy{}, ErrNotFound
	}
	return academyFromRow(results[0]), nil
}
