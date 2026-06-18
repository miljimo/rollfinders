package dataaccess

import (
	"context"
	"time"

	"payments/internal/databases"
)

func CheckoutFromRow(row map[string]interface{}) Checkout {
	return Checkout{
		CheckoutSessionID: stringValue(row["id"]),
		ClientID:          stringValue(row["client_id"]),
		ClientState:       stringValue(row["client_state"]),
		CheckoutURL:       stringValue(row["checkout_url"]),
		PaymentID:         stringValue(row["payment_id"]),
		ResourceType:      stringValue(row["resource_type"]),
		ResourceID:        stringValue(row["resource_id"]),
		ResourceLabel:     stringValue(row["resource_label"]),
		Amount:            int64Value(row["amount_minor"]),
		Currency:          stringValue(row["currency"]),
		PayerUserID:       stringValue(row["payer_user_id"]),
		PayerEmail:        stringValue(row["payer_email"]),
		Metadata:          mapFromJSON(stringValue(row["metadata"])),
		SuccessURL:        stringValue(row["success_url"]),
		CancelURL:         stringValue(row["cancel_url"]),
		ExpiresAt:         timeValue(row["expires_at"]),
		CreatedAt:         timeValue(row["created_at"]),
	}
}

func CreateCheckout(
	ctx context.Context,
	db databases.DataContext,
	id string,
	clientID string,
	clientState interface{},
	paymentID string,
	resourceType string,
	resourceID string,
	resourceLabel interface{},
	amount int64,
	currency string,
	payerUserID interface{},
	payerEmail interface{},
	metadataJSON string,
	successURL string,
	cancelURL string,
	checkoutURL string,
	expiresAt time.Time,
) error {
	_, err := db.Procedure(
		ctx,
		`payments."checkoutInsert"`,
		id,
		clientID,
		clientState,
		paymentID,
		resourceType,
		resourceID,
		resourceLabel,
		amount,
		currency,
		payerUserID,
		payerEmail,
		metadataJSON,
		successURL,
		cancelURL,
		checkoutURL,
		expiresAt,
	)
	return err
}
