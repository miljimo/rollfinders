package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/transfer/service"
)

func ListTransfers(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		transfers, err := svc.ListTransfers(
			r.Context(),
			handlers.Query(r, "wallet_id"),
			handlers.IntQuery(r, "limit", 100),
			handlers.IntQuery(r, "offset", 0),
		)
		if err != nil {
			handlers.ErrorWithStatus(w, transferStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, map[string]any{"data": transfers}, http.StatusOK)
	}
}
