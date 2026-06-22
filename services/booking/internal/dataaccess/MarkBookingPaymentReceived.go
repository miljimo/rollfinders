package dataaccess

import (
	"context"

	"booking/internal/databases"
)

func MarkBookingPaymentReceived(ctx context.Context, db databases.DataContext, id string, reason string) (Booking, error) {
	rows, err := db.Function(ctx, `booking."bookingPaymentReceived"`, id, nullable(reason))
	return bookingMutationResult(rows, err)
}
