package dataaccess

import (
	"context"

	"booking/internal/databases"
)

func ListBookings(ctx context.Context, db databases.DataContext, filter ListBookingsFilter) (BookingList, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	rows, err := db.Function(
		ctx,
		`booking."bookingList"`,
		nullable(filter.CustomerID),
		nullable(filter.GuestReference),
		nullable(filter.OrganisationID),
		nullable(filter.BookableType),
		nullable(filter.BookableID),
		nullable(filter.BookableInstanceID),
		nullable(filter.PaymentID),
		nullable(filter.Status),
		limit,
	)
	if err != nil {
		return BookingList{}, err
	}
	items := make([]Booking, 0, len(rows))
	for _, row := range rows {
		items = append(items, bookingFromRow(row))
	}
	return BookingList{Items: items, Count: len(items)}, nil
}
