package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/dataaccess"
	"rollfinders/internal/services/wallet/endpoints/requests"
	"rollfinders/internal/services/wallet/endpoints/responses"
	"rollfinders/internal/services/wallet/service"
)

func ReverseTransaction(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req requests.ReverseTransactionRequest
		if err := handlers.Json(r, &req); err != nil {
			handlers.ErrorWithStatus(w, handlers.NewStatusError(http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", err, nil), http.StatusInternalServerError)
			return
		}
		transaction, err := svc.Reverse(r.Context(), dataaccess.ReverseInput{TransactionID: req.TransactionID, Description: req.Description, ReferenceType: req.ReferenceType, ReferenceID: req.ReferenceID, IdempotencyKey: r.Header.Get("Idempotency-Key")})
		if err != nil {
			handlers.ErrorWithStatus(w, walletStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, (*responses.TransactionResponse)(transaction), http.StatusCreated)
	}
}
