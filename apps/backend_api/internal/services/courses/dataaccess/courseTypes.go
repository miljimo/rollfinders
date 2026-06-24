package dataaccess

import (
	"context"

	"rollfinders/internal/services/courses/databases"
)

func CreateCourseType(ctx context.Context, db databases.DataContext, id, organisationID, name, description string, isDefault bool) error {
	_, err := db.Procedure(ctx, `courses."courseTypeUpsert"`, id, organisationID, name, description, isDefault, "")
	return err
}

func GetCourseType(ctx context.Context, db databases.DataContext, id string) (CourseType, bool, error) {
	rows, err := db.Function(ctx, `courses."courseTypeGet"`, id)
	if err != nil {
		return CourseType{}, false, err
	}
	if len(rows) == 0 {
		return CourseType{}, false, nil
	}
	return courseTypeFromRow(rows[0]), true, nil
}

func ListCourseTypes(ctx context.Context, db databases.DataContext, organisationID string, limit int, offset int) ([]CourseType, error) {
	rows, err := db.Function(ctx, `courses."courseTypesList"`, organisationID, limit, offset)
	if err != nil {
		return nil, err
	}
	items := make([]CourseType, 0, len(rows))
	for _, row := range rows {
		items = append(items, courseTypeFromRow(row))
	}
	return items, nil
}

func DeleteCourseType(ctx context.Context, db databases.DataContext, id string) error {
	_, err := db.Procedure(ctx, `courses."courseTypeDelete"`, id, "", "")
	return err
}
