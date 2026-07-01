package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/dataaccess"
	"rollfinders/internal/services/wallet/endpoints/requests"
	"rollfinders/internal/services/wallet/endpoints/responses"
	"rollfinders/internal/services/wallet/service"
)

func CreateTransfer(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req requests.CreateTransferRequest
		if err := handlers.Json(r, &req); err != nil {
			handlers.ErrorWithStatus(w, handlers.NewStatusError(http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", err, nil), http.StatusInternalServerError)
			return
		}

		transferObj := dataaccess.TransferInput{
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
			handlers.ErrorWithStatus(w, walletStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, (*responses.TransactionResponse)(transaction), http.StatusCreated)
	}
}
