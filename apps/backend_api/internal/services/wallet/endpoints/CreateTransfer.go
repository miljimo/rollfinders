package endpoints

import (
	"net/http"

	"rollfinders/internal/services/wallet/domain"
	"rollfinders/internal/services/wallet/repository"
	"rollfinders/internal/services/wallet/service"
)

type transferRequest struct {
	SourceWalletID      string          `json:"source_wallet_id"`
	DestinationWalletID string          `json:"destination_wallet_id"`
	Amount              int64           `json:"amount"`
	Currency            domain.Currency `json:"currency"`
	ReferenceType       string          `json:"reference_type"`
	ReferenceID         string          `json:"reference_id"`
	Description         string          `json:"description"`
}

func CreateTransfer(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req transferRequest
		if err := decodeJSON(r, &req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorBody{Error: errorDetail{Code: "invalid_json", Message: "Request body must be valid JSON."}})
			return
		}

		transferObj := repository.TransferInput{
			SourceWalletID:      req.SourceWalletID,
			DestinationWalletID: req.DestinationWalletID,
			Amount:              req.Amount,
			Currency:            req.Currency,
			ReferenceType:       req.ReferenceType,
			ReferenceID:         req.ReferenceID,
			Description:         req.Description,
			IdempotencyKey:      r.Header.Get("Idempotency-Key"),
		}
		transaction, err := svc.Transfer(r.Context(), transferObj)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, transaction)
	}
}
