package dataaccess

import (
	"context"

	"rollfinders/internal/services/booking/databases"
)

func GetBooking(ctx context.Context, db databases.DataContext, id string) (Booking, error) {
	rows, err := db.Function(ctx, `booking."bookingGet"`, id)
	if err != nil {
		return Booking{}, err
	}
	row, err := firstRow(rows)
	if err != nil {
		return Booking{}, err
	}
	return bookingFromRow(row), nil
}
