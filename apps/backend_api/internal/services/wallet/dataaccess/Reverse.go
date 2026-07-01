package dataaccess

import (
	"context"
	"rollfinders/internal/services/wallet/domain"
	"time"
)

func (repo *DatabaseRepository) Reverse(ctx context.Context, input ReverseInput) (*domain.Transaction, error) {
	rows, err := repo.db.Function(
		ctx,
		"wallet.reverse_transaction",
		postgresID("txn"),
		input.IdempotencyKey,
		input.TransactionID,
		input.ReferenceType,
		input.ReferenceID,
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
