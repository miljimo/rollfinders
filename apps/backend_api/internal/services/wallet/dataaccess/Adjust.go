package dataaccess

import (
	"context"
	"rollfinders/internal/services/wallet/domain"
	"time"
)

func (repo *DatabaseRepository) Adjust(ctx context.Context, input AdjustmentInput) (*domain.Transaction, error) {
	rows, err := repo.db.Function(
		ctx,
		"wallet.adjust",
		postgresID("txn"),
		postgresID("led"),
		postgresID("led"),
		input.Type,
		input.WalletID,
		input.CounterWalletID,
		input.Amount,
		input.Currency,
		input.Reference,
		input.IdempotencyKey,
		input.Reason,
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
