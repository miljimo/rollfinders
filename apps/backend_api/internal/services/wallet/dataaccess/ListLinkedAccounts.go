package dataaccess

import (
	"context"

	"rollfinders/internal/services/wallet/domain"
)

func (repo *DatabaseRepository) ListLinkedAccounts(ctx context.Context, walletID string) ([]domain.LinkedAccount, error) {
	if _, err := repo.GetWallet(ctx, walletID); err != nil {
		return nil, err
	}
	rows, err := repo.db.Function(ctx, "wallet.list_linked_wallet_accounts", walletID)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	accounts := []domain.LinkedAccount{}
	for _, row := range rows {
		accounts = append(accounts, LinkedAccountFromRow(row))
	}
	return accounts, nil
}
