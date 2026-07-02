package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/transfer/service"
)

func GetTransfer(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		transfer, err := svc.GetTransfer(r.Context(), handlers.Param(r, "id"))
		if err != nil {
			handlers.ErrorWithStatus(w, transferStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, map[string]any{"transfer": transfer}, http.StatusOK)
	}
}
