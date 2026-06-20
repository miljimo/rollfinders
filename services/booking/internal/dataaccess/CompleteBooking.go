package dataaccess

import (
	"context"

	"booking/internal/databases"
)

func CompleteBooking(ctx context.Context, db databases.DataContext, id string, reason string) (Booking, error) {
	rows, err := db.Function(ctx, `booking."bookingComplete"`, id, nullable(reason))
	return bookingMutationResult(rows, err)
}
