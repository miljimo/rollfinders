package dataaccess

import (
	"context"

	"courses/internal/databases"
)

func UpsertActivity(ctx context.Context, db databases.DataContext, activity Activity) error {
	_, err := db.Procedure(ctx, `courses."courseActivityUpsert"`, activity.ID, activity.CourseID, activity.Title, "GENERAL", activity.Description, activity.StartOffsetMinutes, activity.DurationMinutes, activity.SortOrder, "")
	return err
}

func ListActivities(ctx context.Context, db databases.DataContext, courseID string) ([]Activity, error) {
	rows, err := db.Function(ctx, `courses."courseActivitiesList"`, courseID)
	if err != nil {
		return nil, err
	}
	items := make([]Activity, 0, len(rows))
	for _, row := range rows {
		items = append(items, activityFromRow(row))
	}
	return items, nil
}

func DeleteActivity(ctx context.Context, db databases.DataContext, id string) error {
	_, err := db.Procedure(ctx, `courses."courseActivityDelete"`, id, "", "")
	return err
}
