package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/endpoints/responses"
	"rollfinders/internal/services/wallet/service"
)

func GetWalletBalance(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		balance, err := svc.GetBalance(r.Context(), handlers.Param(r, "id"))
		if err != nil {
			handlers.ErrorWithStatus(w, walletStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, (*responses.BalanceResponse)(balance), http.StatusOK)
	}
}
