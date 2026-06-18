package server

import (
	"net/http"

	"payments/internal/handlers"
)

func (s *server) paymentAction(w http.ResponseWriter, r *http.Request, action string, call func(providerAdapter, Payment, string) (providerResult, error)) {
	key := r.Header.Get("Idempotency-Key")
	if key == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Idempotency-Key header is required.", map[string]string{"idempotency_key": "required"})
		return
	}
	paymentID := handlers.Param(r, "id")
	status, response, replay, err := s.store.withIdempotency(action+":"+paymentID, key, fingerprint([]byte(action+paymentID)), func() (int, any) {
		payment, ok := s.store.getPayment(paymentID)
		if !ok {
			return http.StatusNotFound, ErrorEnvelope{Error: APIError{Code: "not_found", Message: "Payment was not found.", RequestID: requestIDFrom(r)}}
		}
		adapter, err := s.providers.get(payment.Provider)
		if err != nil {
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "unsupported_provider", Message: "Provider is not supported.", RequestID: requestIDFrom(r)}}
		}
		result, err := call(adapter, payment, key)
		if err != nil {
			return http.StatusBadGateway, ErrorEnvelope{Error: APIError{Code: "provider_error", Message: "Provider request failed.", RequestID: requestIDFrom(r)}}
		}
		updated, err := s.store.transitionPayment(payment.ID, result.Status)
		if err != nil {
			return http.StatusConflict, ErrorEnvelope{Error: APIError{Code: "payment_invalid_state", Message: "Payment is not eligible for this operation.", RequestID: requestIDFrom(r)}}
		}
		return http.StatusOK, updated
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
