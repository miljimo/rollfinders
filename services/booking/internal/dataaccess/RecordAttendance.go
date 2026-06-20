package dataaccess

import (
	"context"

	"booking/internal/databases"
)

func RecordAttendance(ctx context.Context, db databases.DataContext, bookingID string, participantID string, attendanceStatus string) (Participant, error) {
	rows, err := db.Function(ctx, `booking."participantAttendanceRecord"`, bookingID, participantID, attendanceStatus)
	return participantMutationResult(rows, err)
}
