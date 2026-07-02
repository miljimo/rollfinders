package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/transfer/service"
)

type updateTransferStatusRequest struct {
	Status        string `json:"status"`
	FailureReason string `json:"failure_reason"`
}

func UpdateTransferStatus(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req updateTransferStatusRequest
		if err := handlers.Json(r, &req); err != nil {
			handlers.ErrorWithStatus(w, handlers.NewStatusError(http.StatusBadRequest,
				"invalid_json", "Request body must be valid JSON.", err, nil), http.StatusInternalServerError)
			return
		}
		transfer, err := svc.UpdateTransferStatus(r.Context(), handlers.Param(r, "id"),
			req.Status, req.FailureReason)
		if err != nil {
			handlers.ErrorWithStatus(w, transferStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, map[string]any{"transfer": transfer}, http.StatusOK)
	}
}
