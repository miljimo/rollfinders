package dataaccess

import (
	"context"

	"academy/internal/databases"
)

func ListAcademyMembers(ctx context.Context, db databases.DataContext, academyID string) ([]AcademyMember, error) {
	results, err := db.Function(ctx, "academy.academyMemberList", academyID)
	if err != nil {
		return nil, err
	}
	members := make([]AcademyMember, 0, len(results))
	for _, row := range results {
		members = append(members, academyMemberFromRow(row))
	}
	return members, nil
}
