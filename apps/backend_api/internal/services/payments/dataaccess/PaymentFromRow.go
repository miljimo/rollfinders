package dataaccess

func PaymentFromRow(row map[string]interface{}) Payment {
	return Payment{
		ID:                stringValue(row["id"]),
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
		CreatedAt:         timeValue(row["created_at"]),
		UpdatedAt:         timeValue(row["updated_at"]),
	}
}
