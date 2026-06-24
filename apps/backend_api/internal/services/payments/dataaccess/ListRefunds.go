package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func ListRefunds(ctx context.Context, db databases.DataContext, paymentID string, limit int, offset int) ([]Refund, error) {
	rows, err := db.Function(ctx, `payments."refundList"`, paymentID, limit, offset)
	if err != nil {
		return nil, err
	}
	refunds := make([]Refund, 0, len(rows))
	for _, row := range rows {
		refunds = append(refunds, RefundFromRow(row))
	}
	return refunds, nil
}
