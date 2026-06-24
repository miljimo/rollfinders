package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func TransitionPayoutRequest(ctx context.Context, db databases.DataContext, id string, nextStatus string, actorID interface{}, providerReference interface{}, reason interface{}, notes interface{}) error {
	_, err := db.Procedure(ctx, `payments."payoutRequestTransition"`, id, nextStatus, actorID, providerReference, reason, notes)
	return err
}
