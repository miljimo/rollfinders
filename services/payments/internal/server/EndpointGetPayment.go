package server

import (
	"net/http"

	"payments/internal/handlers"
)

func (s *server) getPayment(w http.ResponseWriter, r *http.Request) {
	payment, ok := s.store.getPayment(handlers.Param(r, "id"))
	if !ok {
		writeError(w, r, http.StatusNotFound, "not_found", "Payment was not found.", nil)
		return
	}
	writeJSON(w, http.StatusOK, payment)
}
