package dataaccess

import (
	"context"

	"academy/internal/databases"
)

func GetAcademy(ctx context.Context, db databases.DataContext, academyID string) (Academy, error) {
	results, err := db.Function(ctx, "academy.academyGet", academyID)
	if err != nil {
		return Academy{}, err
	}
	if len(results) == 0 {
		return Academy{}, ErrNotFound
	}
	return academyFromRow(results[0]), nil
}
