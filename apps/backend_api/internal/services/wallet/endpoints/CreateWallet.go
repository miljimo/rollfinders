package endpoints

import (
	"net/http"

	"rollfinders/internal/services/wallet/domain"
	"rollfinders/internal/services/wallet/repository"
	"rollfinders/internal/services/wallet/service"
)

type createWalletRequest struct {
	OwnerType domain.OwnerType `json:"owner_type"`
	OwnerID   string           `json:"owner_id"`
	Currency  string           `json:"currency"`
}

func CreateWallet(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createWalletRequest
		if err := decodeJSON(r, &req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorBody{Error: errorDetail{Code: "invalid_json", Message: "Request body must be valid JSON."}})
			return
		}
		wallet, err := svc.CreateWallet(r.Context(), repository.CreateWalletInput{OwnerType: req.OwnerType, OwnerID: req.OwnerID, Currency: req.Currency})
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, wallet)
	}
}
