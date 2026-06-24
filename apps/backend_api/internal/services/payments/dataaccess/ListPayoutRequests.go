package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func ListPayoutRequests(ctx context.Context, db databases.DataContext, clientID interface{}, payeeID interface{}, status interface{}, currency interface{}, limit int, offset int) ([]PayoutRequest, error) {
	rows, err := db.Function(ctx, `payments."payoutRequestList"`, clientID, payeeID, status, currency, limit, offset)
	if err != nil {
		return nil, err
	}
	items := make([]PayoutRequest, 0, len(rows))
	for _, row := range rows {
		items = append(items, PayoutRequestFromRow(row))
	}
	return items, nil
}
