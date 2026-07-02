package dataaccess

import (
	"context"
	"time"

	"rollfinders/internal/services/wallet/domain"
)

func (repo *DatabaseRepository) CreateLinkedAccount(ctx context.Context, input CreateLinkedAccountInput) (*domain.LinkedAccount, error) {
	now := time.Now().UTC()
	rows, err := repo.db.Function(ctx, "wallet.create_linked_wallet_account", postgresID("lwa"), input.WalletID, input.Provider, input.ProviderAccountID, input.ConnectionType, input.Status, input.DisplayName, input.ExternalReference, input.Currency, now, now)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	row, err := First(rows)
	if err != nil {
		return nil, err
	}
	account := LinkedAccountFromRow(row)
	return &account, nil
}
