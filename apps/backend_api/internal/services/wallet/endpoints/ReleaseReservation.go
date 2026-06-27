package endpoints

import (
	"net/http"

	"rollfinders/internal/services/wallet/repository"
	"rollfinders/internal/services/wallet/service"
)

type releaseRequest struct {
	ReservationID string `json:"reservation_id"`
	Description   string `json:"description"`
}

func ReleaseReservation(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req releaseRequest
		if err := decodeJSON(r, &req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorBody{Error: errorDetail{Code: "invalid_json", Message: "Request body must be valid JSON."}})
			return
		}
		reservation, transaction, err := svc.Release(r.Context(), repository.ReleaseInput{ReservationID: req.ReservationID, Description: req.Description, IdempotencyKey: r.Header.Get("Idempotency-Key")})
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"reservation": reservation, "transaction": transaction})
	}
}
