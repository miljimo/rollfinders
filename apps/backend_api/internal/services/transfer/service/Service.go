package service

import (
	"context"
	"strings"

	"rollfinders/internal/services/transfer/domain"
)

type WalletClient interface {
	CreateTransfer(ctx context.Context, input domain.TransferRequest) (domain.WalletTransaction, error)
}

type Service struct {
	wallet WalletClient
}

func New(wallet WalletClient) *Service {
	return &Service{wallet: wallet}
}

func (svc *Service) InitiateTransfer(ctx context.Context, input domain.TransferRequest) (domain.TransferInitiation, error) {
	input.SourceWalletID = strings.TrimSpace(input.SourceWalletID)
	input.DestinationWalletID = strings.TrimSpace(input.DestinationWalletID)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	if input.SourceWalletID == "" || input.DestinationWalletID == "" || input.SourceWalletID == input.DestinationWalletID {
		return domain.TransferInitiation{}, domain.ErrInvalidWallet
	}
	if input.Amount <= 0 {
		return domain.TransferInitiation{}, domain.ErrInvalidAmount
	}
	if len(input.Currency) != 3 {
		return domain.TransferInitiation{}, domain.ErrInvalidCurrency
	}
	if input.IdempotencyKey == "" {
		return domain.TransferInitiation{}, domain.ErrIdempotencyRequired
	}
	transaction, err := svc.wallet.CreateTransfer(ctx, input)
	if err != nil {
		return domain.TransferInitiation{}, err
	}
	return domain.TransferInitiation{Transfer: transaction}, nil
}
