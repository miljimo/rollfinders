package endpoints

import (
	"encoding/json"
	"errors"
	"net/http"

	"rollfinders/internal/services/transfer/domain"
)

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	code := "transfer_error"
	message := "Transfer request could not be completed."
	switch {
	case errors.Is(err, domain.ErrInvalidAmount), errors.Is(err, domain.ErrInvalidCurrency), errors.Is(err, domain.ErrInvalidWallet), errors.Is(err, domain.ErrIdempotencyRequired):
		status, code, message = http.StatusBadRequest, "validation_error", err.Error()
	case errors.Is(err, domain.ErrWalletTransferFailed):
		status, code, message = http.StatusConflict, "wallet_transfer_failed", err.Error()
	case errors.Is(err, domain.ErrWalletServiceUnavailable):
		status, code, message = http.StatusBadGateway, "wallet_service_unavailable", err.Error()
	}
	writeJSON(w, status, errorBody{Error: errorDetail{Code: code, Message: message}})
}

func decodeJSON(r *http.Request, target interface{}) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(target)
}
