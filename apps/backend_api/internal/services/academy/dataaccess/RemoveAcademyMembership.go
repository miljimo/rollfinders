package dataaccess

import (
	"context"

	"rollfinders/internal/services/academy/databases"
)

func RemoveAcademyMembership(ctx context.Context, db databases.DataContext, membershipID string) (bool, error) {
	affected, err := db.Execute(ctx, "DELETE FROM academy.academy_members WHERE id = $1", membershipID)
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}
