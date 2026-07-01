package dataaccess

import (
	"context"
	"rollfinders/internal/services/wallet/domain"
	"time"
)

func (repo *DatabaseRepository) CreateWallet(ctx context.Context, input CreateWalletInput) (*domain.Wallet, error) {
	now := time.Now().UTC()
	rows, err := repo.db.Function(ctx, "wallet.create_wallet", postgresID("wal"), input.Type, input.OwnerID, input.Currency, domain.WalletActive, now, now)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	wallet, err := WalletFromFirst(rows)
	if err != nil {
		return nil, err
	}
	return &wallet, nil
}
