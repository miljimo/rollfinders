package dataaccess

import (
	"context"

	"booking/internal/databases"
)

func ListParticipants(ctx context.Context, db databases.DataContext, bookingID string) ([]Participant, error) {
	rows, err := db.Function(ctx, `booking."participantList"`, bookingID)
	if err != nil {
		return nil, err
	}
	items := make([]Participant, 0, len(rows))
	for _, row := range rows {
		items = append(items, participantFromRow(row))
	}
	return items, nil
}
