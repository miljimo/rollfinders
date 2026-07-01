package dataaccess

import (
	"context"
	"database/sql"
	"errors"
	"rollfinders/internal/services/wallet/domain"
)

func (repo *DatabaseRepository) GetTransaction(ctx context.Context, id string) (*domain.Transaction, []domain.Statement, error) {
	rows, err := repo.db.Function(ctx, "wallet.get_transaction", id)
	if err != nil {
		return nil, nil, mapDatabaseError(err)
	}
	transaction, err := TransactionFromFirst(rows)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil, domain.ErrTransactionNotFound
	}
	if err != nil {
		return nil, nil, err
	}
	entries, err := repo.transactionStatements(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	return &transaction, entries, nil
}

func (repo *DatabaseRepository) transactionStatements(ctx context.Context, transactionID string) ([]domain.Statement, error) {
	rows, err := repo.db.Function(ctx, "wallet.get_transaction_statements", transactionID)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	entries := []domain.Statement{}
	for _, row := range rows {
		entries = append(entries, StatementFromRow(row))
	}
	return entries, nil
}
