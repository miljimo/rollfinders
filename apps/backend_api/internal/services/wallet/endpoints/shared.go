package endpoints

import (
	"encoding/json"
	"errors"
	"net/http"

	"rollfinders/internal/services/wallet/domain"
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
	code := "wallet_error"
	message := "Wallet request could not be completed."
	switch {
	case errors.Is(err, domain.ErrWalletNotFound), errors.Is(err, domain.ErrTransactionNotFound):
		status, code, message = http.StatusNotFound, "not_found", err.Error()
	case errors.Is(err, domain.ErrInvalidAmount), errors.Is(err, domain.ErrInvalidCurrency), errors.Is(err, domain.ErrInvalidOwner), errors.Is(err, domain.ErrInvalidWalletType), errors.Is(err, domain.ErrInvalidWalletPair), errors.Is(err, domain.ErrIdempotencyRequired):
		status, code, message = http.StatusBadRequest, "validation_error", err.Error()
	case errors.Is(err, domain.ErrWalletInactive), errors.Is(err, domain.ErrWalletReadOnly), errors.Is(err, domain.ErrCurrencyMismatch), errors.Is(err, domain.ErrInsufficientFunds), errors.Is(err, domain.ErrAlreadyReversed):
		status, code, message = http.StatusConflict, "business_rule_violation", err.Error()
	}
	writeJSON(w, status, errorBody{Error: errorDetail{Code: code, Message: message}})
}

func decodeJSON(r *http.Request, target interface{}) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(target)
}
