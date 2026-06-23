package dataaccess

func PaymentAccountSettingFromRow(row map[string]interface{}) PaymentAccountSetting {
	return PaymentAccountSetting{
		ID:                stringValue(row["id"]),
		OwnerType:         stringValue(row["owner_type"]),
		OwnerID:           stringValue(row["owner_id"]),
		AcademyID:         stringValue(row["academy_id"]),
		Provider:          stringValue(row["provider"]),
		ProviderAccountID: stringValue(row["provider_account_id"]),
		Status:            stringValue(row["status"]),
		ChargesEnabled:    boolValue(row["charges_enabled"]),
		PayoutsEnabled:    boolValue(row["payouts_enabled"]),
		CreatedAt:         timeValue(row["created_at"]),
		UpdatedAt:         timeValue(row["updated_at"]),
	}
}
