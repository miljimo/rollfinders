package dataaccess

func PaymentRecordFromRow(row map[string]interface{}) PaymentRecord {
	payment := Payment{
		ID:                stringValue(row["payment_id"]),
		Amount:            int64Value(row["amount_minor"]),
		Currency:          stringValue(row["currency"]),
		Provider:          stringValue(row["provider"]),
		PaymentMethodType: stringValue(row["payment_method_type"]),
		CaptureMethod:     stringValue(row["capture_method"]),
		Status:            stringValue(row["status"]),
		RefundedAmount:    int64Value(row["refunded_amount_minor"]),
		ExternalReference: stringValue(row["external_reference"]),
		Metadata:          mapFromJSON(stringValue(row["metadata"])),
		ProviderPaymentID: stringValue(row["provider_payment_id"]),
		ProviderRawStatus: stringValue(row["provider_raw_status"]),
		CreatedAt:         timeValue(row["payment_created_at"]),
		UpdatedAt:         timeValue(row["payment_updated_at"]),
	}
	return PaymentRecord{
		Payment:           payment,
		CheckoutSessionID: stringValue(row["checkout_session_id"]),
		ClientID:          stringValue(row["client_id"]),
		ClientState:       stringValue(row["client_state"]),
		ResourceType:      stringValue(row["resource_type"]),
		ResourceID:        stringValue(row["resource_id"]),
		ResourceLabel:     stringValue(row["resource_label"]),
		PayerUserID:       stringValue(row["payer_user_id"]),
		PayerEmail:        stringValue(row["payer_email"]),
	}
}
