package server

import (
	"net/http"

	"rollfinders/internal/services/payments/handlers"
)

func (s *server) listRefunds(w http.ResponseWriter, r *http.Request) {
	limit := limitFromQuery(r.URL.Query().Get("limit"))
	offset := offsetFromQuery(r.URL.Query().Get("offset"))
	refunds, ok := s.store.listRefunds(handlers.Param(r, "id"), limit, offset)
	if !ok {
		writeError(w, r, http.StatusNotFound, "not_found", "Payment was not found.", nil)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"refunds": refunds, "pagination": pagination(limit, offset, len(refunds))})
}
