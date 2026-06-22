package dataaccess

import (
	"context"

	"payments/internal/databases"
)

func GetPayeeBalance(ctx context.Context, db databases.DataContext, payeeID string, clientID interface{}, currency string) (PayeeBalance, error) {
	row, err := firstRow(db.Function(ctx, `payments."payeeBalanceGet"`, payeeID, clientID, currency))
	if err != nil {
		return PayeeBalance{}, err
	}
	return PayeeBalanceFromRow(row), nil
}
