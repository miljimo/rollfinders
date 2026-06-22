package dataaccess

import (
	"context"

	"payments/internal/databases"
)

func CreatePayoutRequest(ctx context.Context, db databases.DataContext, id string, clientID string, payeeID string, amount int64, currency string, destinationAccountID string, requestedBy interface{}, notes interface{}) error {
	_, err := db.Procedure(ctx, `payments."payoutRequestCreate"`, id, clientID, payeeID, amount, currency, destinationAccountID, requestedBy, notes)
	return err
}
