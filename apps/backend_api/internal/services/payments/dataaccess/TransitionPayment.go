package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func TransitionPayment(ctx context.Context, db databases.DataContext, id string, nextStatus string, reason interface{}) error {
	_, err := db.Procedure(ctx, `payments."paymentTransition"`, id, nextStatus, reason)
	return err
}
