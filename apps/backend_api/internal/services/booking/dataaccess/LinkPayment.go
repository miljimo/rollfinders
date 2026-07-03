package dataaccess

import (
	"context"

	"rollfinders/internal/services/booking/databases"
)

/*
TODO

	LinkPayment.go , MarkBookingPaymentReceived.go e.t.c can all be merged as UpdateBooking.go that allow updating the booking services.
*/
func LinkPayment(ctx context.Context, db databases.DataContext, id string, paymentID string) (Booking, error) {
	rows, err := db.Function(ctx, `booking."bookingPaymentLink"`, id, paymentID)
	return bookingMutationResult(rows, err)
}
