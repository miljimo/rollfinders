package dataaccess

import (
	"context"

	"rollfinders/internal/services/academy/databases"
)

func RemoveAcademyMember(ctx context.Context, db databases.DataContext, academyID string, userID string) (bool, error) {
	results, err := db.Function(ctx, "academy.academyMemberRemove", academyID, userID)
	if err != nil {
		return false, err
	}
	if len(results) == 0 {
		return false, nil
	}
	value, _ := results[0]["removed"].(bool)
	return value, nil
}
