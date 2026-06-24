package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func ListPaymentHistory(
	ctx context.Context,
	db databases.DataContext,
	clientID interface{},
	resourceType interface{},
	resourceID interface{},
	payerUserID interface{},
	payerEmail interface{},
	status interface{},
	limit int,
	offset int,
) ([]PaymentRecord, error) {
	rows, err := db.Function(
		ctx,
		`payments."paymentHistoryList"`,
		clientID,
		resourceType,
		resourceID,
		payerUserID,
		payerEmail,
		status,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}
	records := make([]PaymentRecord, 0, len(rows))
	for _, row := range rows {
		records = append(records, PaymentRecordFromRow(row))
	}
	return records, nil
}
