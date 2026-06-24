package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func CreatePayment(
	ctx context.Context,
	db databases.DataContext,
	id string,
	amount int64,
	currency string,
	provider string,
	paymentMethodType string,
	captureMethod string,
	status string,
	externalReference interface{},
	metadataJSON string,
	providerPaymentID interface{},
	providerRawStatus interface{},
) error {
	_, err := db.Procedure(
		ctx,
		`payments."paymentInsert"`,
		id,
		amount,
		currency,
		provider,
		paymentMethodType,
		captureMethod,
		status,
		externalReference,
		metadataJSON,
		providerPaymentID,
		providerRawStatus,
	)
	return err
}
