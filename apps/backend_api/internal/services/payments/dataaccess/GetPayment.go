package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func GetPayment(ctx context.Context, db databases.DataContext, id string) (Payment, error) {
	row, err := firstRow(db.Function(ctx, `payments."paymentGet"`, id))
	if err != nil {
		return Payment{}, err
	}
	return PaymentFromRow(row), nil
}
