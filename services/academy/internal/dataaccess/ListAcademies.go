package dataaccess

import (
	"context"

	"academy/internal/databases"
)

func ListAcademies(ctx context.Context, db databases.DataContext, organisationID string, search string, limit int, offset int) ([]Academy, error) {
	results, err := db.Function(ctx, "academy.academyList", organisationID, search, limit, offset)
	if err != nil {
		return nil, err
	}
	academies := make([]Academy, 0, len(results))
	for _, row := range results {
		academies = append(academies, academyFromRow(row))
	}
	return academies, nil
}
