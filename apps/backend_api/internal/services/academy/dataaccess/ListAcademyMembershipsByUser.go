package dataaccess

import (
	"context"

	"rollfinders/internal/services/academy/databases"
)

func ListAcademyMembershipsByUser(ctx context.Context, db databases.DataContext, userID string, limit int, offset int) ([]AcademyMember, error) {
	results, err := db.Function(ctx, "academy.academyMemberListByUser", userID, limit, offset)
	if err != nil {
		return nil, err
	}
	members := make([]AcademyMember, 0, len(results))
	for _, row := range results {
		members = append(members, academyMemberFromRow(row))
	}
	return members, nil
}
