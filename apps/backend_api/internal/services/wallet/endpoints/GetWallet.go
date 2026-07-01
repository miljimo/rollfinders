package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/service"
)

func GetWallet(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet, err := svc.GetWallet(r.Context(), handlers.Param(r, "id"))
		if err != nil {
			handlers.ErrorWithStatus(w, walletStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, wallet, http.StatusOK)
	}
}
