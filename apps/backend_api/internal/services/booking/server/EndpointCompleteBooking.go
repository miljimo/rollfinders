package server

import (
	"net/http"

	"rollfinders/internal/services/booking/dataaccess"
	"rollfinders/internal/services/booking/handlers"
)

func (s *server) completeBooking(w http.ResponseWriter, r *http.Request) {
	if err := requireIdempotencyKey(r); err != nil {
		writeError(w, r, http.StatusBadRequest, "missing_idempotency_key", "Idempotency-Key header is required.", nil)
		return
	}
	req := statusRequest{}
	if r.Body != nil && r.ContentLength != 0 {
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body must be valid status JSON.", nil)
			return
		}
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	booking, err := dataaccess.CompleteBooking(r.Context(), db, handlers.Param(r, "booking_id"), cleanString(req.Reason))
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, booking)
}
