package dataaccess

import (
	"context"

	"payments/internal/databases"
)

func GetPaymentClient(ctx context.Context, db databases.DataContext, id string) (PaymentClient, error) {
	row, err := firstRow(db.Function(ctx, `payments."paymentClientGet"`, id))
	if err != nil {
		return PaymentClient{}, err
	}
	return PaymentClientFromRow(row), nil
}
