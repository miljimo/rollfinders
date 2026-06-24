package server

import "net/http"

func (s *server) createPayment(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, true)
	if !ok {
		return
	}
	req, details := decodeCreatePayment(raw)
	if len(details) > 0 {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Payment request validation failed.", details)
		return
	}
	key := r.Header.Get("Idempotency-Key")
	status, response, replay, err := s.store.withIdempotency("create_payment", key, fingerprint(raw), func() (int, any) {
		adapter, err := s.providers.get(req.Provider)
		if err != nil {
			return http.StatusBadRequest, ErrorEnvelope{Error: APIError{Code: "unsupported_provider", Message: "Provider is not supported.", RequestID: requestIDFrom(r)}}
		}
		result, err := adapter.CreatePayment(req, key)
		if err != nil {
			return http.StatusBadGateway, ErrorEnvelope{Error: APIError{Code: "provider_error", Message: "Provider request failed.", RequestID: requestIDFrom(r)}}
		}
		payment := s.store.createPayment(req, result)
		s.store.mu.Lock()
		s.store.metrics.payments++
		s.store.metrics.providerSuccess++
		s.store.mu.Unlock()
		return http.StatusCreated, payment
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
