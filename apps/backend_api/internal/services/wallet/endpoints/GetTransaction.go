package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/service"
)

func GetTransaction(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		transaction, entries, err := svc.GetTransaction(r.Context(), handlers.Param(r, "id"))
		if err != nil {
			handlers.ErrorWithStatus(w, walletStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, map[string]interface{}{"transaction": transaction, "ledger_entries": entries}, http.StatusOK)
	}
}
