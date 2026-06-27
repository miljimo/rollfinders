package endpoints

import (
	"net/http"

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
		if err := decodeJSON(r, &req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorBody{Error: errorDetail{Code: "invalid_json", Message: "Request body must be valid JSON."}})
			return
		}
		transaction, err := svc.Reverse(r.Context(), repository.ReverseInput{TransactionID: req.TransactionID, Description: req.Description, ReferenceType: req.ReferenceType, ReferenceID: req.ReferenceID, IdempotencyKey: r.Header.Get("Idempotency-Key")})
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, transaction)
	}
}
