package server

import (
	"net/http"
	"strings"

	"payments/internal/handlers"
)

func (s *server) listPayeePayoutRequests(w http.ResponseWriter, r *http.Request) {
	payeeID := strings.TrimSpace(handlers.Param(r, "payee_id"))
	if payeeID == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Payee id is required.", map[string]string{"payee_id": "required"})
		return
	}
	filter := payoutRequestFilter{
		ClientID: strings.TrimSpace(r.URL.Query().Get("client_id")),
		PayeeID:  payeeID,
		Status:   strings.TrimSpace(r.URL.Query().Get("status")),
		Currency: strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("currency"))),
		Limit:    limitFromQuery(r.URL.Query().Get("limit")),
	}
	payouts := s.store.listPayoutRequests(filter)
	writeJSON(w, http.StatusOK, payoutRequestListResponse{PayoutRequests: payouts, Count: len(payouts)})
}

func (s *server) listPayoutRequests(w http.ResponseWriter, r *http.Request) {
	filter := payoutRequestFilter{
		ClientID: strings.TrimSpace(r.URL.Query().Get("client_id")),
		PayeeID:  strings.TrimSpace(r.URL.Query().Get("payee_id")),
		Status:   strings.TrimSpace(r.URL.Query().Get("status")),
		Currency: strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("currency"))),
		Limit:    limitFromQuery(r.URL.Query().Get("limit")),
	}
	payouts := s.store.listPayoutRequests(filter)
	writeJSON(w, http.StatusOK, payoutRequestListResponse{PayoutRequests: payouts, Count: len(payouts)})
}
