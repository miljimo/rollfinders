package dataaccess

import (
	"context"

	"payments/internal/databases"
)

func ListRefunds(ctx context.Context, db databases.DataContext, paymentID string) ([]Refund, error) {
	rows, err := db.Function(ctx, "payments.refund_list", paymentID)
	if err != nil {
		return nil, err
	}
	refunds := make([]Refund, 0, len(rows))
	for _, row := range rows {
		refunds = append(refunds, RefundFromRow(row))
	}
	return refunds, nil
}
