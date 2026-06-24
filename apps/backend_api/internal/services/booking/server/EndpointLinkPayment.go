package server

import (
	"net/http"

	"rollfinders/internal/services/booking/dataaccess"
	"rollfinders/internal/services/booking/handlers"
)

type paymentLinkRequest struct {
	PaymentID string `json:"payment_id"`
}

func (s *server) linkPayment(w http.ResponseWriter, r *http.Request) {
	if err := requireIdempotencyKey(r); err != nil {
		writeError(w, r, http.StatusBadRequest, "missing_idempotency_key", "Idempotency-Key header is required.", nil)
		return
	}
	var req paymentLinkRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body must be valid payment link JSON.", nil)
		return
	}
	req.PaymentID = cleanString(req.PaymentID)
	if req.PaymentID == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "payment_id is required.", nil)
		return
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	booking, err := dataaccess.LinkPayment(r.Context(), db, handlers.Param(r, "booking_id"), req.PaymentID)
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, booking)
}
