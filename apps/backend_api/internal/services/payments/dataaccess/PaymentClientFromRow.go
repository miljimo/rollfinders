package dataaccess

func PaymentClientFromRow(row map[string]interface{}) PaymentClient {
	return PaymentClient{
		ID:          stringValue(row["id"]),
		Name:        stringValue(row["name"]),
		CallbackURL: stringValue(row["callback_url"]),
		CreatedAt:   timeValue(row["created_at"]),
	}
}
