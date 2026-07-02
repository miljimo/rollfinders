package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/transfer/domain"
	"rollfinders/internal/services/transfer/service"
)

type createTransferRequest struct {
	SourceWalletID      string `json:"source_wallet_id"`
	DestinationWalletID string `json:"destination_wallet_id"`
	Amount              int64  `json:"amount"`
	Currency            string `json:"currency"`
	ReferenceType       string `json:"reference_type"`
	ReferenceID         string `json:"reference_id"`
	Description         string `json:"description"`
}

func CreateTransfer(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createTransferRequest
		if err := handlers.Json(r, &req); err != nil {
			handlers.ErrorWithStatus(w, handlers.NewStatusError(http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", err, nil), http.StatusInternalServerError)
			return
		}
		result, err := svc.InitiateTransfer(r.Context(), domain.TransferRequest{
			SourceWalletID:      req.SourceWalletID,
			DestinationWalletID: req.DestinationWalletID,
			Amount:              req.Amount,
			Currency:            req.Currency,
			ReferenceType:       req.ReferenceType,
			ReferenceID:         req.ReferenceID,
			Description:         req.Description,
			IdempotencyKey:      r.Header.Get("Idempotency-Key"),
		})
		if err != nil {
			handlers.ErrorWithStatus(w, transferStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, result, http.StatusCreated)
	}
}
