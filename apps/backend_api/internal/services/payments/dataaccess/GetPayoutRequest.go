package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func GetPayoutRequest(ctx context.Context, db databases.DataContext, id string) (PayoutRequest, error) {
	row, err := firstRow(db.Function(ctx, `payments."payoutRequestGet"`, id))
	if err != nil {
		return PayoutRequest{}, err
	}
	return PayoutRequestFromRow(row), nil
}
