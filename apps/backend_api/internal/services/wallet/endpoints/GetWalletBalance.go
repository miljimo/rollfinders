package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/service"
)

func GetWalletBalance(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		balance, err := svc.GetBalance(r.Context(), handlers.Param(r, "id"))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, balance)
	}
}
