package repository

import (
	"context"
	"time"

	"rollfinders/internal/services/wallet/domain"
)

type CreateWalletInput struct {
	OwnerType domain.OwnerType
	OwnerID   string
	Currency  string
}

type ListWalletsInput struct {
	OwnerType domain.OwnerType
	OwnerID   string
	Limit     int
	Offset    int
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
	Currency            string
	ReferenceType       string
	ReferenceID         string
	IdempotencyKey      string
	Description         string
}

type ReserveInput struct {
	WalletID       string
	Amount         int64
	Currency       string
	ReferenceType  string
	ReferenceID    string
	IdempotencyKey string
	Description    string
	ExpiresAt      *time.Time
}

type ReleaseInput struct {
	ReservationID  string
	IdempotencyKey string
	Description    string
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
	Currency        string
	Reason          string
	AdministratorID string
	Reference       string
	IdempotencyKey  string
}

type Repository interface {
	CreateWallet(ctx context.Context, input CreateWalletInput) (domain.Wallet, error)
	ListWallets(ctx context.Context, input ListWalletsInput) (WalletPage, error)
	GetWallet(ctx context.Context, id string) (domain.Wallet, error)
	GetBalance(ctx context.Context, walletID string) (domain.Balance, error)
	ListWalletTransactions(ctx context.Context, walletID string) ([]domain.Transaction, error)
	GetTransaction(ctx context.Context, id string) (domain.Transaction, []domain.LedgerEntry, error)
	Transfer(ctx context.Context, input TransferInput) (domain.Transaction, error)
	Reserve(ctx context.Context, input ReserveInput) (domain.Reservation, domain.Transaction, error)
	Release(ctx context.Context, input ReleaseInput) (domain.Reservation, domain.Transaction, error)
	Reverse(ctx context.Context, input ReverseInput) (domain.Transaction, error)
	Adjust(ctx context.Context, input AdjustmentInput) (domain.Transaction, error)
}
