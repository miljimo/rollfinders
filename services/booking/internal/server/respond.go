package server

import (
	"errors"
	"net/http"

	"booking/internal/dataaccess"
)

func (s *server) writeDataError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, dataaccess.ErrNotFound):
		writeError(w, r, http.StatusNotFound, "not_found", "Booking resource was not found.", nil)
	case errors.Is(err, dataaccess.ErrConflict):
		writeError(w, r, http.StatusConflict, "duplicate_booking", "An active booking already exists for this bookable resource.", nil)
	case errors.Is(err, dataaccess.ErrInvalidTransition):
		writeError(w, r, http.StatusConflict, "invalid_status_transition", "Booking status transition is not allowed.", nil)
	case errors.Is(err, dataaccess.ErrInvalidPaymentLink):
		writeError(w, r, http.StatusUnprocessableEntity, "invalid_payment_link", "Payment cannot be linked to this booking.", nil)
	default:
		s.logger.Error("booking data error", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusInternalServerError, "internal_error", "Booking request could not be completed.", nil)
	}
}
