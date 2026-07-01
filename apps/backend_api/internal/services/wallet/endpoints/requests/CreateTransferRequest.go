package requests

import "rollfinders/internal/services/wallet/domain"

type CreateTransferRequest struct {
	SourceWalletID      string          `json:"source_wallet_id"`
	DestinationWalletID string          `json:"destination_wallet_id"`
	Amount              int64           `json:"amount"`
	Currency            domain.Currency `json:"currency"`
	ReferenceType       string          `json:"reference_type"`
	ReferenceID         string          `json:"reference_id"`
	Description         string          `json:"description"`
}
