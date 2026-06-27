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

func normalizeCurrency(currency string) string {
	return strings.ToUpper(strings.TrimSpace(currency))
}

func validateAmount(amount int64) error {
	if amount <= 0 {
		return domain.ErrInvalidAmount
	}
	return nil
}

func validateCurrency(currency string) error {
	currency = normalizeCurrency(currency)
	if len(currency) != 3 {
		return domain.ErrInvalidCurrency
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
	input.Currency = normalizeCurrency(input.Currency)
	if err := validateCurrency(input.Currency); err != nil {
		return domain.Wallet{}, err
	}
	if input.OwnerType == "" {
		input.OwnerType = domain.OwnerSystem
	}
	return svc.repo.CreateWallet(ctx, input)
}

func (svc *Service) ListWallets(ctx context.Context, input repository.ListWalletsInput) (repository.WalletPage, error) {
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

func (svc *Service) GetTransaction(ctx context.Context, id string) (domain.Transaction, []domain.LedgerEntry, error) {
	return svc.repo.GetTransaction(ctx, id)
}

func (svc *Service) Transfer(ctx context.Context, input repository.TransferInput) (domain.Transaction, error) {
	input.Currency = normalizeCurrency(input.Currency)
	if input.Type == "" {
		input.Type = domain.TransactionTransfer
	}
	if err := requireKey(input.IdempotencyKey); err != nil {
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

func (svc *Service) Reserve(ctx context.Context, input repository.ReserveInput) (domain.Reservation, domain.Transaction, error) {
	input.Currency = normalizeCurrency(input.Currency)
	if err := requireKey(input.IdempotencyKey); err != nil {
		return domain.Reservation{}, domain.Transaction{}, err
	}
	if err := validateAmount(input.Amount); err != nil {
		return domain.Reservation{}, domain.Transaction{}, err
	}
	if err := validateCurrency(input.Currency); err != nil {
		return domain.Reservation{}, domain.Transaction{}, err
	}
	return svc.repo.Reserve(ctx, input)
}

func (svc *Service) Release(ctx context.Context, input repository.ReleaseInput) (domain.Reservation, domain.Transaction, error) {
	if err := requireKey(input.IdempotencyKey); err != nil {
		return domain.Reservation{}, domain.Transaction{}, err
	}
	return svc.repo.Release(ctx, input)
}

func (svc *Service) Reverse(ctx context.Context, input repository.ReverseInput) (domain.Transaction, error) {
	if err := requireKey(input.IdempotencyKey); err != nil {
		return domain.Transaction{}, err
	}
	return svc.repo.Reverse(ctx, input)
}

func (svc *Service) Adjust(ctx context.Context, input repository.AdjustmentInput) (domain.Transaction, error) {
	input.Currency = normalizeCurrency(input.Currency)
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
