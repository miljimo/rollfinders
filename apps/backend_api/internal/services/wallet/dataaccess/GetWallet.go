package dataaccess

import (
	"context"
	"database/sql"
	"errors"
	"rollfinders/internal/services/wallet/domain"
)

func (repo *DatabaseRepository) GetWallet(ctx context.Context, id string) (*domain.Wallet, error) {
	rows, err := repo.db.Function(ctx, "wallet.get_wallet", id)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	wallet, err := WalletFromFirst(rows)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrWalletNotFound
	}
	if err != nil {
		return nil, err
	}
	return &wallet, nil
}
