package dataaccess

import (
	"context"
	"rollfinders/internal/services/wallet/domain"
)

func (repo *DatabaseRepository) ListWallets(ctx context.Context, input ListWalletsInput) (WalletPage, error) {
	limit := clampLimit(input.Limit)
	offset := input.Offset
	if offset < 0 {
		offset = 0
	}
	rows, err := repo.db.Function(ctx, "wallet.list_wallets", input.OwnerID, input.Type, input.Currency, limit, offset)
	if err != nil {
		return WalletPage{}, mapDatabaseError(err)
	}
	wallets := []domain.Wallet{}
	total := 0
	for _, row := range rows {
		total = WalletTotal(row)
		wallets = append(wallets, WalletFromRow(row))
	}
	return WalletPage{Wallets: wallets, Total: total, Limit: limit, Offset: offset}, nil
}
