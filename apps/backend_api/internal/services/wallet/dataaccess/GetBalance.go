package dataaccess

import (
	"context"
	"database/sql"
	"errors"
	"rollfinders/internal/services/wallet/domain"
)

func (repo *DatabaseRepository) GetBalance(ctx context.Context, walletID string) (*domain.Balance, error) {
	rows, err := repo.db.Function(ctx, "wallet.get_balance", walletID)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	row, err := BalanceFromFirst(rows)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrWalletNotFound
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}
