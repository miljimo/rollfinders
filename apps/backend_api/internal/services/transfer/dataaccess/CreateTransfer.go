package dataaccess

import (
	"context"
	"time"

	"rollfinders/internal/services/transfer/domain"
)

func (repo *DatabaseRepository) CreateTransfer(ctx context.Context, input CreateTransferInput) (*domain.Transfer, error) {
	rows, err := repo.db.Function(
		ctx,
		"transfer.create_transfer_request",
		postgresID("trf"),
		input.SourceWalletID,
		input.DestinationWalletID,
		input.Amount,
		input.Currency,
		input.ReferenceType,
		input.ReferenceID,
		input.Description,
		input.IdempotencyKey,
		time.Now().UTC(),
	)
	if err != nil {
		return nil, err
	}
	return TransferFromFirst(rows)
}
