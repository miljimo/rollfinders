package dataaccess

import (
	"context"
	"rollfinders/internal/services/wallet/domain"
	"time"
)

func (repo *DatabaseRepository) Transfer(ctx context.Context, input TransferInput) (*domain.Transaction, error) {
	rows, err := repo.db.Function(
		ctx,
		"wallet.transfer",
		input.IdempotencyKey,
		postgresID("led"),
		postgresID("led"),
		input.Type,
		input.SourceWalletID,
		input.DestinationWalletID,
		input.Amount,
		input.Currency,
		input.ReferenceType,
		input.ReferenceID,
		input.IdempotencyKey,
		input.Description,
		time.Now().UTC(),
	)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	transaction, err := TransactionFromFirst(rows)
	if err != nil {
		return nil, err
	}
	return &transaction, nil
}
