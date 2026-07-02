package service

import (
	"context"
	"strings"

	"rollfinders/internal/services/wallet/dataaccess"
	"rollfinders/internal/services/wallet/domain"
)

type Service struct {
	repo dataaccess.Repository
}

func New(repo dataaccess.Repository) *Service {
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

func validateLinkedAccountProvider(provider domain.LinkedAccountProvider) error {
	switch provider {
	case domain.LinkedAccountProviderStripe, domain.LinkedAccountProviderPayPal, domain.LinkedAccountProviderCard, domain.LinkedAccountProviderBank:
		return nil
	default:
		return domain.ErrInvalidProvider
	}
}

func validateLinkedAccountConnectionType(connectionType domain.LinkedAccountConnectionType) error {
	switch connectionType {
	case domain.LinkedAccountTopUp, domain.LinkedAccountPayout, domain.LinkedAccountBoth:
		return nil
	default:
		return domain.ErrInvalidConnectionType
	}
}

func validateLinkedAccountStatus(status domain.LinkedAccountStatus) error {
	switch status {
	case domain.LinkedAccountPending, domain.LinkedAccountConnected, domain.LinkedAccountFailed, domain.LinkedAccountDisabled:
		return nil
	default:
		return domain.ErrInvalidLinkedAccountStatus
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

func (svc *Service) CreateWallet(ctx context.Context, input dataaccess.CreateWalletInput) (*domain.Wallet, error) {
	input.Type = normalizeWalletType(input.Type)
	input.OwnerID = strings.TrimSpace(input.OwnerID)
	input.Currency = domain.Currency(dataaccess.NormalizeCurrency(string(input.Currency)))
	if err := validateWalletType(input.Type); err != nil {
		return nil, err
	}
	if err := validateOwner(input.OwnerID); err != nil {
		return nil, err
	}
	if err := validateCurrency(input.Currency); err != nil {
		return nil, err
	}
	return svc.repo.CreateWallet(ctx, input)
}

func (svc *Service) ListWallets(ctx context.Context, input dataaccess.ListWalletsInput) (dataaccess.WalletPage, error) {
	input.Type = normalizeWalletType(input.Type)
	input.OwnerID = strings.TrimSpace(input.OwnerID)
	input.Currency = domain.Currency(dataaccess.NormalizeCurrency(string(input.Currency)))
	return svc.repo.ListWallets(ctx, input)
}

func (svc *Service) GetWallet(ctx context.Context, id string) (*domain.Wallet, error) {
	return svc.repo.GetWallet(ctx, id)
}

func (svc *Service) ListLinkedAccounts(ctx context.Context, walletID string) ([]domain.LinkedAccount, error) {
	return svc.repo.ListLinkedAccounts(ctx, strings.TrimSpace(walletID))
}

func (svc *Service) CreateLinkedAccount(ctx context.Context, input dataaccess.CreateLinkedAccountInput) (*domain.LinkedAccount, error) {
	input.WalletID = strings.TrimSpace(input.WalletID)
	input.Provider = domain.LinkedAccountProvider(strings.ToUpper(strings.TrimSpace(string(input.Provider))))
	input.ConnectionType = domain.LinkedAccountConnectionType(strings.ToUpper(strings.TrimSpace(string(input.ConnectionType))))
	input.Status = domain.LinkedAccountStatus(strings.ToUpper(strings.TrimSpace(string(input.Status))))
	input.ProviderAccountID = strings.TrimSpace(input.ProviderAccountID)
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	input.ExternalReference = strings.TrimSpace(input.ExternalReference)
	input.Currency = domain.Currency(dataaccess.NormalizeCurrency(string(input.Currency)))
	if input.WalletID == "" {
		return nil, domain.ErrWalletNotFound
	}
	if err := validateLinkedAccountProvider(input.Provider); err != nil {
		return nil, err
	}
	if err := validateLinkedAccountConnectionType(input.ConnectionType); err != nil {
		return nil, err
	}
	if err := validateLinkedAccountStatus(input.Status); err != nil {
		return nil, err
	}
	if err := validateCurrency(input.Currency); err != nil {
		return nil, err
	}
	return svc.repo.CreateLinkedAccount(ctx, input)
}

func (svc *Service) GetBalance(ctx context.Context, walletID string) (*domain.Balance, error) {
	return svc.repo.GetBalance(ctx, walletID)
}

func (svc *Service) ListWalletTransactions(ctx context.Context, walletID string) ([]domain.Transaction, error) {
	return svc.repo.ListWalletTransactions(ctx, walletID)
}

func (svc *Service) GetTransaction(ctx context.Context, id string) (*domain.Transaction, []domain.Statement, error) {
	return svc.repo.GetTransaction(ctx, id)
}

func (svc *Service) Transfer(ctx context.Context, input dataaccess.TransferInput) (*domain.Transaction, error) {
	input.SourceWalletID = strings.TrimSpace(input.SourceWalletID)
	input.DestinationWalletID = strings.TrimSpace(input.DestinationWalletID)
	input.Currency = domain.Currency(dataaccess.NormalizeCurrency(string(input.Currency)))
	if input.Type == "" {
		input.Type = domain.TransactionTransfer
	}
	if err := requireKey(input.IdempotencyKey); err != nil {
		return nil, err
	}
	if err := validateWalletPair(input.SourceWalletID, input.DestinationWalletID); err != nil {
		return nil, err
	}
	if err := validateAmount(input.Amount); err != nil {
		return nil, err
	}
	if err := validateCurrency(input.Currency); err != nil {
		return nil, err
	}
	return svc.repo.Transfer(ctx, input)
}

func (svc *Service) Reverse(ctx context.Context, input dataaccess.ReverseInput) (*domain.Transaction, error) {
	if err := requireKey(input.IdempotencyKey); err != nil {
		return nil, err
	}
	return svc.repo.Reverse(ctx, input)
}

func (svc *Service) Adjust(ctx context.Context, input dataaccess.AdjustmentInput) (*domain.Transaction, error) {
	input.Currency = domain.Currency(dataaccess.NormalizeCurrency(string(input.Currency)))
	if err := requireKey(input.IdempotencyKey); err != nil {
		return nil, err
	}
	if err := validateAmount(input.Amount); err != nil {
		return nil, err
	}
	if err := validateCurrency(input.Currency); err != nil {
		return nil, err
	}
	return svc.repo.Adjust(ctx, input)
}
