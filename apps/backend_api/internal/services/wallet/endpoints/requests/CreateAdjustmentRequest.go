package requests

import "rollfinders/internal/services/wallet/domain"

type CreateAdjustmentRequest struct {
	WalletID        string                 `json:"wallet_id"`
	CounterWalletID string                 `json:"counter_wallet_id"`
	Type            domain.TransactionType `json:"type"`
	Amount          int64                  `json:"amount"`
	Currency        domain.Currency        `json:"currency"`
	Reason          string                 `json:"reason"`
	AdministratorID string                 `json:"administrator_id"`
	Reference       string                 `json:"reference"`
}
