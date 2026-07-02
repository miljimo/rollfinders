package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/dataaccess"
	"rollfinders/internal/services/wallet/endpoints/requests"
	"rollfinders/internal/services/wallet/endpoints/responses"
	"rollfinders/internal/services/wallet/service"
)

func CreateLinkedAccount(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req requests.CreateLinkedAccountRequest
		if err := handlers.Json(r, &req); err != nil {
			handlers.ErrorWithStatus(w, handlers.NewStatusError(http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", err, nil), http.StatusInternalServerError)
			return
		}
		account, err := svc.CreateLinkedAccount(r.Context(), dataaccess.CreateLinkedAccountInput{
			WalletID:          handlers.Param(r, "id"),
			Provider:          req.Provider,
			ProviderAccountID: req.ProviderAccountID,
			ConnectionType:    req.ConnectionType,
			Status:            req.Status,
			DisplayName:       req.DisplayName,
			ExternalReference: req.ExternalReference,
			Currency:          req.Currency,
		})
		if err != nil {
			handlers.ErrorWithStatus(w, walletStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, (*responses.LinkedAccountResponse)(account), http.StatusCreated)
	}
}
