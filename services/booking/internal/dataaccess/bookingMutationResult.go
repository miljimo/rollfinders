package dataaccess

import (
	"strings"

	"booking/internal/databases"
)

func bookingMutationResult(rows databases.DBResults, err error) (Booking, error) {
	if err != nil {
		message := strings.ToLower(err.Error())
		if strings.Contains(message, "booking_not_found") {
			return Booking{}, ErrNotFound
		}
		if strings.Contains(message, "invalid_status") {
			return Booking{}, ErrInvalidTransition
		}
		if strings.Contains(message, "invalid_payment") {
			return Booking{}, ErrInvalidPaymentLink
		}
		return Booking{}, err
	}
	row, err := firstRow(rows)
	if err != nil {
		return Booking{}, err
	}
	return bookingFromRow(row), nil
}
