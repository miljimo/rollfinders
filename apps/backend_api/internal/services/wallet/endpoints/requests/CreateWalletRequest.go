package requests

import "rollfinders/internal/services/wallet/domain"

type CreateWalletRequest struct {
	WalletType      domain.WalletType `json:"walletType"`
	WalletTypeSnake domain.WalletType `json:"wallet_type"`
	OwnerID         string            `json:"ownerId"`
	OwnerIDSnake    string            `json:"owner_id"`
	Currency        domain.Currency   `json:"currency"`
}

func (request CreateWalletRequest) Type() domain.WalletType {
	if request.WalletType != "" {
		return request.WalletType
	}
	return request.WalletTypeSnake
}

func (request CreateWalletRequest) Owner() string {
	if request.OwnerID != "" {
		return request.OwnerID
	}
	return request.OwnerIDSnake
}
