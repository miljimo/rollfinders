package dataaccess

import (
	"context"

	"payments/internal/databases"
)

func GetCheckout(ctx context.Context, db databases.DataContext, id string) (Checkout, error) {
	row, err := firstRow(db.Function(ctx, "payments.checkout_get", id))
	if err != nil {
		return Checkout{}, err
	}
	return CheckoutFromRow(row), nil
}
