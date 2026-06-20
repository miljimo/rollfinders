package dataaccess

import (
	"context"

	"booking/internal/databases"
)

func CancelBooking(ctx context.Context, db databases.DataContext, id string, reason string) (Booking, error) {
	rows, err := db.Function(ctx, `booking."bookingCancel"`, id, nullable(reason))
	return bookingMutationResult(rows, err)
}
