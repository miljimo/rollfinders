package server

import (
	"encoding/json"
	"errors"
	"net/http"

	"payments/internal/handlers"
)

func (s *server) createRefund(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, true)
	if !ok {
		return
	}
	var req refundRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Refund request validation failed.", nil)
		return
	}
	key := r.Header.Get("Idempotency-Key")
	paymentID := handlers.Param(r, "id")
	status, response, replay, err := s.store.withIdempotency("refund:"+paymentID, key, fingerprint(raw), func() (int, any) {
		payment, ok := s.store.getPayment(paymentID)
		if !ok {
			return http.StatusNotFound, ErrorEnvelope{Error: APIError{Code: "not_found", Message: "Payment was not found.", RequestID: requestIDFrom(r)}}
		}
		adapter, err := s.providers.get(payment.Provider)
		if err != nil {
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "unsupported_provider", Message: "Provider is not supported.", RequestID: requestIDFrom(r)}}
		}
		result, err := adapter.Refund(payment, req, key)
		if err != nil {
			return http.StatusBadGateway, ErrorEnvelope{Error: APIError{Code: "provider_error", Message: "Provider request failed.", RequestID: requestIDFrom(r)}}
		}
		refund, _, err := s.store.createRefund(paymentID, req, result)
		switch {
		case errors.Is(err, errNotFound):
			return http.StatusNotFound, ErrorEnvelope{Error: APIError{Code: "not_found", Message: "Payment was not found.", RequestID: requestIDFrom(r)}}
		case errors.Is(err, errOverRefund):
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "refund_exceeds_available_amount", Message: "Refund amount exceeds the refundable balance.", RequestID: requestIDFrom(r)}}
		case errors.Is(err, errInvalidTransition):
			return http.StatusConflict, ErrorEnvelope{Error: APIError{Code: "payment_invalid_state", Message: "Payment is not refundable.", RequestID: requestIDFrom(r)}}
		}
		s.store.mu.Lock()
		s.store.metrics.refunds++
		s.store.mu.Unlock()
		return http.StatusCreated, refund
	})
	if err != nil {
		writeIdempotencyError(w, r, err)
		return
	}
	if replay {
		w.Header().Set("Idempotent-Replayed", "true")
	}
	writeJSON(w, status, response)
}
