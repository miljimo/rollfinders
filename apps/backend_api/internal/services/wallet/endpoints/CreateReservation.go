package endpoints

import (
	"net/http"
	"time"

	"rollfinders/internal/services/wallet/repository"
	"rollfinders/internal/services/wallet/service"
)

type reserveRequest struct {
	WalletID      string `json:"wallet_id"`
	Amount        int64  `json:"amount"`
	Currency      string `json:"currency"`
	ReferenceType string `json:"reference_type"`
	ReferenceID   string `json:"reference_id"`
	Description   string `json:"description"`
	ExpiresAt     string `json:"expires_at"`
}

func CreateReservation(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req reserveRequest
		if err := decodeJSON(r, &req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorBody{Error: errorDetail{Code: "invalid_json", Message: "Request body must be valid JSON."}})
			return
		}
		var expiresAt *time.Time
		if req.ExpiresAt != "" {
			parsed, err := time.Parse(time.RFC3339, req.ExpiresAt)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, errorBody{Error: errorDetail{Code: "validation_error", Message: "expires_at must be RFC3339."}})
				return
			}
			expiresAt = &parsed
		}
		reservation, transaction, err := svc.Reserve(r.Context(), repository.ReserveInput{
			WalletID: req.WalletID, Amount: req.Amount, Currency: req.Currency, ReferenceType: req.ReferenceType, ReferenceID: req.ReferenceID,
			Description: req.Description, ExpiresAt: expiresAt, IdempotencyKey: r.Header.Get("Idempotency-Key"),
		})
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, map[string]interface{}{"reservation": reservation, "transaction": transaction})
	}
}
