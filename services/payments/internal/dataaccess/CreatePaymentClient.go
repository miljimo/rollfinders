package dataaccess

import (
	"context"

	"payments/internal/databases"
)

func CreatePaymentClient(ctx context.Context, db databases.DataContext, id string, name string, callbackURL string) error {
	_, err := db.Procedure(ctx, `payments."paymentClientUpsert"`, id, name, callbackURL)
	return err
}
