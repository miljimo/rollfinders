package dataaccess

import (
	"context"
	"rollfinders/internal/services/wallet/domain"
)

func (repo *DatabaseRepository) ListWalletTransactions(ctx context.Context, walletID string) ([]domain.Transaction, error) {
	if _, err := repo.GetWallet(ctx, walletID); err != nil {
		return nil, err
	}
	rows, err := repo.db.Function(ctx, "wallet.list_wallet_transactions", walletID)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	transactions := []domain.Transaction{}
	for _, row := range rows {
		transactions = append(transactions, TransactionFromRow(row))
	}
	return transactions, nil
}
