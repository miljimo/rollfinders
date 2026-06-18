package server

import (
	"net/http"

	"payments/internal/handlers"
)

func (s *server) listRefunds(w http.ResponseWriter, r *http.Request) {
	refunds, ok := s.store.listRefunds(handlers.Param(r, "id"))
	if !ok {
		writeError(w, r, http.StatusNotFound, "not_found", "Payment was not found.", nil)
		return
	}
	writeJSON(w, http.StatusOK, map[string][]Refund{"refunds": refunds})
}
