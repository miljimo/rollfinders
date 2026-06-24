package dataaccess

import (
	"context"

	"rollfinders/internal/services/booking/databases"
)

func LinkPayment(ctx context.Context, db databases.DataContext, id string, paymentID string) (Booking, error) {
	rows, err := db.Function(ctx, `booking."bookingPaymentLink"`, id, paymentID)
	return bookingMutationResult(rows, err)
}
