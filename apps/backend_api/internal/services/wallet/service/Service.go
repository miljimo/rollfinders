package service

import (
	"context"
	"strings"

	"rollfinders/internal/services/wallet/domain"
	"rollfinders/internal/services/wallet/repository"
)

type Service struct {
	repo repository.Repository
}

func New(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

func normalizeWalletType(walletType domain.WalletType) domain.WalletType {
	return domain.WalletType(strings.ToLower(strings.TrimSpace(string(walletType))))
}

func validateAmount(amount int64) error {
	if amount <= 0 {
		return domain.ErrInvalidAmount
	}
	return nil
}

func validateCurrency(currency domain.Currency) error {
	switch currency {
	case domain.CurrencyGBP, domain.CurrencyPoints:
		return nil
	default:
		return domain.ErrInvalidCurrency
	}
}

func validateWalletType(walletType domain.WalletType) error {
	switch walletType {
	case domain.WalletInternal, domain.WalletExternal:
		return nil
	default:
		return domain.ErrInvalidWalletType
	}
}

func validateOwner(ownerID string) error {
	if strings.TrimSpace(ownerID) == "" {
		return domain.ErrInvalidOwner
	}
	return nil
}

func validateWalletPair(sourceWalletID string, destinationWalletID string) error {
	sourceWalletID = strings.TrimSpace(sourceWalletID)
	destinationWalletID = strings.TrimSpace(destinationWalletID)
	if sourceWalletID == "" || destinationWalletID == "" || sourceWalletID == destinationWalletID {
		return domain.ErrInvalidWalletPair
	}
	return nil
}

func requireKey(key string) error {
	if strings.TrimSpace(key) == "" {
		return domain.ErrIdempotencyRequired
	}
	return nil
}

func (svc *Service) CreateWallet(ctx context.Context, input repository.CreateWalletInput) (domain.Wallet, error) {
	input.Type = normalizeWalletType(input.Type)
	input.OwnerID = strings.TrimSpace(input.OwnerID)
	input.Currency = domain.Currency(repository.NormalizeCurrency(string(input.Currency)))
	if err := validateWalletType(input.Type); err != nil {
		return domain.Wallet{}, err
	}
	if err := validateOwner(input.OwnerID); err != nil {
		return domain.Wallet{}, err
	}
	if err := validateCurrency(input.Currency); err != nil {
		return domain.Wallet{}, err
	}
	return svc.repo.CreateWallet(ctx, input)
}

func (svc *Service) ListWallets(ctx context.Context, input repository.ListWalletsInput) (repository.WalletPage, error) {
	input.Type = normalizeWalletType(input.Type)
	input.OwnerID = strings.TrimSpace(input.OwnerID)
	input.Currency = domain.Currency(repository.NormalizeCurrency(string(input.Currency)))
	return svc.repo.ListWallets(ctx, input)
}

func (svc *Service) GetWallet(ctx context.Context, id string) (domain.Wallet, error) {
	return svc.repo.GetWallet(ctx, id)
}

func (svc *Service) GetBalance(ctx context.Context, walletID string) (domain.Balance, error) {
	return svc.repo.GetBalance(ctx, walletID)
}

func (svc *Service) ListWalletTransactions(ctx context.Context, walletID string) ([]domain.Transaction, error) {
	return svc.repo.ListWalletTransactions(ctx, walletID)
}

func (svc *Service) GetTransaction(ctx context.Context, id string) (domain.Transaction, []domain.Statement, error) {
	return svc.repo.GetTransaction(ctx, id)
}

func (svc *Service) Transfer(ctx context.Context, input repository.TransferInput) (domain.Transaction, error) {
	input.SourceWalletID = strings.TrimSpace(input.SourceWalletID)
	input.DestinationWalletID = strings.TrimSpace(input.DestinationWalletID)
	input.Currency = domain.Currency(repository.NormalizeCurrency(string(input.Currency)))
	if input.Type == "" {
		input.Type = domain.TransactionTransfer
	}
	if err := requireKey(input.IdempotencyKey); err != nil {
		return domain.Transaction{}, err
	}
	if err := validateWalletPair(input.SourceWalletID, input.DestinationWalletID); err != nil {
		return domain.Transaction{}, err
	}
	if err := validateAmount(input.Amount); err != nil {
		return domain.Transaction{}, err
	}
	if err := validateCurrency(input.Currency); err != nil {
		return domain.Transaction{}, err
	}
	return svc.repo.Transfer(ctx, input)
}

func (svc *Service) Reverse(ctx context.Context, input repository.ReverseInput) (domain.Transaction, error) {
	if err := requireKey(input.IdempotencyKey); err != nil {
		return domain.Transaction{}, err
	}
	return svc.repo.Reverse(ctx, input)
}

func (svc *Service) Adjust(ctx context.Context, input repository.AdjustmentInput) (domain.Transaction, error) {
	input.Currency = domain.Currency(repository.NormalizeCurrency(string(input.Currency)))
	if err := requireKey(input.IdempotencyKey); err != nil {
		return domain.Transaction{}, err
	}
	if err := validateAmount(input.Amount); err != nil {
		return domain.Transaction{}, err
	}
	if err := validateCurrency(input.Currency); err != nil {
		return domain.Transaction{}, err
	}
	return svc.repo.Adjust(ctx, input)
}
