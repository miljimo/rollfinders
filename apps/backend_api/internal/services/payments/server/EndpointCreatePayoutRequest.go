package server

import (
	"net/http"
	"strings"

	"rollfinders/internal/services/payments/handlers"
)

func (s *server) createPayoutRequest(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, true)
	if !ok {
		return
	}
	payeeID := strings.TrimSpace(handlers.Param(r, "payee_id"))
	if payeeID == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Payee id is required.", map[string]string{"payee_id": "required"})
		return
	}
	req, details := decodeCreatePayoutRequest(raw)
	if len(details) > 0 {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Payout request validation failed.", details)
		return
	}
	key := r.Header.Get("Idempotency-Key")
	status, response, replay, err := s.store.withIdempotency("payout-request:"+payeeID, key, fingerprint(raw), func() (int, any) {
		payout, err := s.store.createPayoutRequest(payeeID, req)
		switch err {
		case nil:
			return http.StatusCreated, payout
		case errPayoutDestination:
			return http.StatusConflict, ErrorEnvelope{Error: APIError{Code: "payee_account_not_enabled", Message: "Payee payout destination is not enabled.", RequestID: requestIDFrom(r)}}
		case errInsufficientFunds:
			return http.StatusConflict, ErrorEnvelope{Error: APIError{Code: "payout_balance_unavailable", Message: "Requested payout amount is not available.", RequestID: requestIDFrom(r)}}
		default:
			return http.StatusInternalServerError, ErrorEnvelope{Error: APIError{Code: "internal_error", Message: "Could not create payout request.", RequestID: requestIDFrom(r)}}
		}
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
