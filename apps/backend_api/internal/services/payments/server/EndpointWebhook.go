package server

import (
	"net/http"

	"rollfinders/internal/services/payments/handlers"
)

func (s *server) webhook(w http.ResponseWriter, r *http.Request) {
	provider := handlers.Param(r, "provider")
	adapter, err := s.providers.get(provider)
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "unsupported_provider", "Provider is not supported.", nil)
		return
	}
	raw, ok := readJSONEndpoint(w, r, false)
	if !ok {
		return
	}
	event, err := adapter.ParseWebhook(raw, providerHeaders(r))
	if err != nil {
		writeError(w, r, http.StatusUnauthorized, "webhook_signature_invalid", "Webhook signature verification failed.", nil)
		return
	}
	if event.ID == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Webhook event id is required.", nil)
		return
	}
	if !s.store.recordProviderEvent(provider, event.ID) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "duplicate"})
		return
	}
	if event.PaymentID != "" && event.Status != "" {
		_, err := s.store.transitionPayment(event.PaymentID, event.Status)
		if err != nil && err != errNotFound {
			writeError(w, r, http.StatusConflict, "payment_invalid_state", "Webhook transition is not valid.", nil)
			return
		}
	}
	s.store.mu.Lock()
	s.store.metrics.webhooks++
	s.store.mu.Unlock()
	s.logger.Info("webhook processed", "provider", provider, "provider_event_id", event.ID, "result", "accepted")
	writeJSON(w, http.StatusOK, map[string]string{"status": "accepted"})
}
