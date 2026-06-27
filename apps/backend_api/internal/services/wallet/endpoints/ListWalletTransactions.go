package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/service"
)

func ListWalletTransactions(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		transactions, err := svc.ListWalletTransactions(r.Context(), handlers.Param(r, "id"))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": transactions})
	}
}
