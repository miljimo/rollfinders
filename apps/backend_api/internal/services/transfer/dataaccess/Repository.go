package dataaccess

import (
	"context"
	"errors"

	"rollfinders/internal/core/databases"
	"rollfinders/internal/services/transfer/domain"
)

type CreateTransferInput struct {
	SourceWalletID      string
	DestinationWalletID string
	Amount              int64
	Currency            string
	ReferenceType       string
	ReferenceID         string
	Description         string
	IdempotencyKey      string
}

type ListTransfersInput struct {
	WalletID string
	Limit    int
	Offset   int
}

type FailTransferInput struct {
	ID            string
	FailureReason string
}

type Repository interface {
	CreateTransfer(ctx context.Context, input CreateTransferInput) (*domain.Transfer, error)
	MarkTransferProcessing(ctx context.Context, id string) (*domain.Transfer, error)
	CompleteTransfer(ctx context.Context, id string) (*domain.Transfer, error)
	FailTransfer(ctx context.Context, input FailTransferInput) (*domain.Transfer, error)
	GetTransfer(ctx context.Context, id string) (*domain.Transfer, error)
	ListTransfers(ctx context.Context, input ListTransfersInput) ([]domain.Transfer, error)
}

type DatabaseRepository struct {
	db databases.DataContext
}

func NewDatabaseRepository(db databases.DataContext) (*DatabaseRepository, error) {
	if db == nil {
		return nil, errors.New("transfer database context is required")
	}
	return &DatabaseRepository{db: db}, nil
}
