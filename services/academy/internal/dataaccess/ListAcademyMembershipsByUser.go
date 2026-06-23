package dataaccess

import (
	"context"

	"academy/internal/databases"
)

func ListAcademyMembershipsByUser(ctx context.Context, db databases.DataContext, userID string) ([]AcademyMember, error) {
	results, err := db.Function(ctx, "academy.academyMemberListByUser", userID)
	if err != nil {
		return nil, err
	}
	members := make([]AcademyMember, 0, len(results))
	for _, row := range results {
		members = append(members, academyMemberFromRow(row))
	}
	return members, nil
}
