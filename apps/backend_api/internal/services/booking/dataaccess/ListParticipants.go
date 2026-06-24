package dataaccess

import (
	"context"

	"rollfinders/internal/services/booking/databases"
)

func ListParticipants(ctx context.Context, db databases.DataContext, bookingID string, limit int, offset int) ([]Participant, error) {
	rows, err := db.Function(ctx, `booking."participantList"`, bookingID, limit, offset)
	if err != nil {
		return nil, err
	}
	items := make([]Participant, 0, len(rows))
	for _, row := range rows {
		items = append(items, participantFromRow(row))
	}
	return items, nil
}
