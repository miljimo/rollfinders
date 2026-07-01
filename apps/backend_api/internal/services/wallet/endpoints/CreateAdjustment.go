package endpoints

import (
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/domain"
	"rollfinders/internal/services/wallet/repository"
	"rollfinders/internal/services/wallet/service"
)

type adjustmentRequest struct {
	WalletID        string                 `json:"wallet_id"`
	CounterWalletID string                 `json:"counter_wallet_id"`
	Type            domain.TransactionType `json:"type"`
	Amount          int64                  `json:"amount"`
	Currency        domain.Currency        `json:"currency"`
	Reason          string                 `json:"reason"`
	AdministratorID string                 `json:"administrator_id"`
	Reference       string                 `json:"reference"`
}

func CreateAdjustment(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req adjustmentRequest
		if err := handlers.Json(r, &req); err != nil {
			handlers.ErrorWithStatus(w, handlers.NewStatusError(http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", err, nil), http.StatusInternalServerError)
			return
		}
		transaction, err := svc.Adjust(r.Context(), repository.AdjustmentInput{
			WalletID: req.WalletID, CounterWalletID: req.CounterWalletID, Type: req.Type, Amount: req.Amount, Currency: req.Currency,
			Reason: req.Reason, AdministratorID: req.AdministratorID, Reference: req.Reference, IdempotencyKey: r.Header.Get("Idempotency-Key"),
		})
		if err != nil {
			handlers.ErrorWithStatus(w, walletStatusError(err), http.StatusInternalServerError)
			return
		}
		_ = handlers.SuccessWithData(w, transaction, http.StatusCreated)
	}
}
