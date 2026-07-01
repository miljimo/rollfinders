package dataaccess

import (
	"context"

	"rollfinders/internal/services/wallet/domain"
)

type CreateWalletInput struct {
	Type     domain.WalletType
	OwnerID  string
	Currency domain.Currency
}

type ListWalletsInput struct {
	OwnerID  string
	Type     domain.WalletType
	Currency domain.Currency
	Limit    int
	Offset   int
}

type WalletPage struct {
	Wallets []domain.Wallet
	Total   int
	Limit   int
	Offset  int
}

type TransferInput struct {
	Type                domain.TransactionType
	SourceWalletID      string
	DestinationWalletID string
	Amount              int64
	Currency            domain.Currency
	ReferenceType       string
	ReferenceID         string
	IdempotencyKey      string
	Description         string
}

type ReverseInput struct {
	TransactionID  string
	IdempotencyKey string
	Description    string
	ReferenceType  string
	ReferenceID    string
}

type AdjustmentInput struct {
	WalletID        string
	CounterWalletID string
	Type            domain.TransactionType
	Amount          int64
	Currency        domain.Currency
	Reason          string
	AdministratorID string
	Reference       string
	IdempotencyKey  string
}

type Repository interface {
	CreateWallet(ctx context.Context, input CreateWalletInput) (*domain.Wallet, error)
	ListWallets(ctx context.Context, input ListWalletsInput) (WalletPage, error)
	GetWallet(ctx context.Context, id string) (*domain.Wallet, error)
	ListLinkedAccounts(ctx context.Context, walletID string) ([]domain.LinkedAccount, error)
	GetBalance(ctx context.Context, walletID string) (*domain.Balance, error)
	ListWalletTransactions(ctx context.Context, walletID string) ([]domain.Transaction, error)
	GetTransaction(ctx context.Context, id string) (*domain.Transaction, []domain.Statement, error)
	Transfer(ctx context.Context, input TransferInput) (*domain.Transaction, error)
	Reverse(ctx context.Context, input ReverseInput) (*domain.Transaction, error)
	Adjust(ctx context.Context, input AdjustmentInput) (*domain.Transaction, error)
}
