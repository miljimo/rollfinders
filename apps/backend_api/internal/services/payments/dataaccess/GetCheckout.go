package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func GetCheckout(ctx context.Context, db databases.DataContext, id string) (Checkout, error) {
	row, err := firstRow(db.Function(ctx, `payments."checkoutGet"`, id))
	if err != nil {
		return Checkout{}, err
	}
	return CheckoutFromRow(row), nil
}
