package dataaccess

func RefundFromRow(row map[string]interface{}) Refund {
	return Refund{
		ID:               stringValue(row["id"]),
		PaymentID:        stringValue(row["payment_id"]),
		Amount:           int64Value(row["amount_minor"]),
		Currency:         stringValue(row["currency"]),
		Status:           stringValue(row["status"]),
		Reason:           stringValue(row["reason"]),
		ProviderRefundID: stringValue(row["provider_refund_id"]),
		CreatedAt:        timeValue(row["created_at"]),
		UpdatedAt:        timeValue(row["updated_at"]),
	}
}
