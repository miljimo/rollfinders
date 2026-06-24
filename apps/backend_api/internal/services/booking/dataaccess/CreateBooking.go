package dataaccess

import (
	"context"
	"strings"

	"rollfinders/internal/services/booking/databases"
)

func CreateBooking(ctx context.Context, db databases.DataContext, input CreateBookingInput) (Booking, error) {
	rows, err := db.Function(
		ctx,
		`booking."bookingCreate"`,
		input.ID,
		input.Reference,
		input.BookableType,
		input.BookableID,
		input.BookableInstanceID,
		nullable(input.CustomerID),
		nullable(input.GuestReference),
		input.OrganisationID,
		input.ParticipantCount,
		input.Metadata,
		input.PaymentRequired,
	)
	if err != nil {
		if strings.Contains(err.Error(), "uq_booking_active_customer_instance") {
			return Booking{}, ErrConflict
		}
		return Booking{}, err
	}
	row, err := firstRow(rows)
	if err != nil {
		return Booking{}, err
	}
	return bookingFromRow(row), nil
}

func nullable(value string) interface{} {
	if value == "" {
		return nil
	}
	return value
}
