package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/repository"
	"rollfinders/internal/services/wallet/service"
)

type reverseRequest struct {
	TransactionID string `json:"transaction_id"`
	Description   string `json:"description"`
	ReferenceType string `json:"reference_type"`
	ReferenceID   string `json:"reference_id"`
}

func ReverseTransaction(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req reverseRequest
		if err := handlers.Json(r, &req); err != nil {
			handlers.ErrorWithStatus(w, handlers.NewStatusError(http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", err, nil), http.StatusInternalServerError)
			return
		}
		transaction, err := svc.Reverse(r.Context(), repository.ReverseInput{TransactionID: req.TransactionID, Description: req.Description, ReferenceType: req.ReferenceType, ReferenceID: req.ReferenceID, IdempotencyKey: r.Header.Get("Idempotency-Key")})
		if err != nil {
			handlers.ErrorWithStatus(w, walletStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, transaction, http.StatusCreated)
	}
}
