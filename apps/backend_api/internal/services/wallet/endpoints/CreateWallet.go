package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/domain"
	"rollfinders/internal/services/wallet/repository"
	"rollfinders/internal/services/wallet/service"
)

type createWalletRequest struct {
	WalletType      domain.WalletType `json:"walletType"`
	WalletTypeSnake domain.WalletType `json:"wallet_type"`
	OwnerID         string            `json:"ownerId"`
	OwnerIDSnake    string            `json:"owner_id"`
	Currency        domain.Currency   `json:"currency"`
}

func CreateWallet(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createWalletRequest
		if err := handlers.Json(r, &req); err != nil {
			handlers.ErrorWithStatus(w, handlers.NewStatusError(http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", err, nil), http.StatusInternalServerError)
			return
		}
		walletType := req.WalletType
		if walletType == "" {
			walletType = req.WalletTypeSnake
		}
		ownerID := req.OwnerID
		if ownerID == "" {
			ownerID = req.OwnerIDSnake
		}
		wallet, err := svc.CreateWallet(r.Context(), repository.CreateWalletInput{Type: walletType, OwnerID: ownerID, Currency: req.Currency})
		if err != nil {
			handlers.ErrorWithStatus(w, walletStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, wallet, http.StatusCreated)
	}
}
