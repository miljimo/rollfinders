package dataaccess

import (
	"context"

	"payments/internal/databases"
)

func CreateRefund(ctx context.Context, db databases.DataContext, id string, paymentID string, amount int64, currency string, status string, reason interface{}, providerRefundID interface{}) error {
	_, err := db.Procedure(ctx, `payments."refundInsert"`, id, paymentID, amount, currency, status, reason, providerRefundID)
	return err
}
