package server

import (
	"errors"
	"net/http"

	"rollfinders/internal/services/payments/handlers"
)

func (s *server) getPayoutRequest(w http.ResponseWriter, r *http.Request) {
	payout, err := s.store.getPayoutRequest(handlers.Param(r, "id"))
	if errors.Is(err, errNotFound) {
		writeError(w, r, http.StatusNotFound, "payout_request_not_found", "Payout request was not found.", nil)
		return
	}
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "internal_error", "Could not load payout request.", nil)
		return
	}
	writeJSON(w, http.StatusOK, payout)
}
