package dataaccess

import (
	"context"

	"academy/internal/databases"
)

func AddAcademyMember(ctx context.Context, db databases.DataContext, memberID string, academyID string, userID string) (AcademyMember, error) {
	results, err := db.Function(ctx, "academy.academyMemberAdd", memberID, academyID, userID)
	if err != nil {
		return AcademyMember{}, err
	}
	if len(results) == 0 {
		return AcademyMember{}, ErrNotFound
	}
	return academyMemberFromRow(results[0]), nil
}
