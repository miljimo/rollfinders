package server

import (
	"net/http"
	"strings"
)

func (s *server) listPayments(w http.ResponseWriter, r *http.Request) {
	filter := paymentHistoryFilter{
		ClientID:     strings.TrimSpace(r.URL.Query().Get("client_id")),
		ResourceType: strings.TrimSpace(r.URL.Query().Get("resource_type")),
		ResourceID:   strings.TrimSpace(r.URL.Query().Get("resource_id")),
		PayerUserID:  strings.TrimSpace(r.URL.Query().Get("payer_user_id")),
		PayerEmail:   strings.TrimSpace(r.URL.Query().Get("payer_email")),
		Status:       strings.TrimSpace(r.URL.Query().Get("status")),
		Limit:        limitFromQuery(r.URL.Query().Get("limit")),
	}
	payments := s.store.listPayments(filter)
	writeJSON(w, http.StatusOK, PaymentHistoryResponse{Payments: payments, Count: len(payments)})
}
