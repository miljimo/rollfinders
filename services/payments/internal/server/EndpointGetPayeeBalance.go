package server

import (
	"net/http"
	"strings"

	"payments/internal/handlers"
)

func (s *server) getPayeeBalance(w http.ResponseWriter, r *http.Request) {
	payeeID := strings.TrimSpace(handlers.Param(r, "payee_id"))
	if payeeID == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Payee id is required.", map[string]string{"payee_id": "required"})
		return
	}
	balance := s.store.getPayeeBalance(payeeID, strings.TrimSpace(r.URL.Query().Get("client_id")), strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("currency"))))
	writeJSON(w, http.StatusOK, balance)
}
