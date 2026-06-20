package dataaccess

import (
	"context"
	"encoding/json"

	"courses/internal/databases"
)

func UpsertCourse(ctx context.Context, db databases.DataContext, course Course) error {
	metadata, err := json.Marshal(course.IntegrationMetadata)
	if err != nil {
		return err
	}
	_, err = db.Procedure(ctx, `courses."courseUpsert"`, course.ID, course.OrganisationID, course.CourseTypeID, course.Title, course.Description, course.Level, course.Capacity, course.PriceAmount, course.Currency, course.Status, course.CreatedByUserID, string(metadata))
	return err
}

func GetCourse(ctx context.Context, db databases.DataContext, id string) (Course, bool, error) {
	rows, err := db.Function(ctx, `courses."courseGet"`, id)
	if err != nil {
		return Course{}, false, err
	}
	if len(rows) == 0 {
		return Course{}, false, nil
	}
	return courseFromRow(rows[0]), true, nil
}

func ListCourses(ctx context.Context, db databases.DataContext, organisationID string) ([]Course, error) {
	rows, err := db.Function(ctx, `courses."coursesList"`, organisationID, "", "", 50, 0)
	if err != nil {
		return nil, err
	}
	items := make([]Course, 0, len(rows))
	for _, row := range rows {
		items = append(items, courseFromRow(row))
	}
	return items, nil
}

func DeleteCourse(ctx context.Context, db databases.DataContext, id string) error {
	_, err := db.Procedure(ctx, `courses."courseDelete"`, id, "", "")
	return err
}
