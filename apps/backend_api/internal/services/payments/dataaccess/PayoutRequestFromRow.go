package dataaccess

func PayoutRequestFromRow(row map[string]interface{}) PayoutRequest {
	return PayoutRequest{
		ID:                   stringValue(row["id"]),
		ClientID:             stringValue(row["client_id"]),
		PayeeID:              stringValue(row["payee_id"]),
		Amount:               int64Value(row["amount_minor"]),
		Currency:             stringValue(row["currency"]),
		Status:               stringValue(row["status"]),
		DestinationAccountID: stringValue(row["destination_account_id"]),
		RequestedBy:          stringValue(row["requested_by"]),
		ActorID:              stringValue(row["actor_id"]),
		ProviderReference:    stringValue(row["provider_reference"]),
		Reason:               stringValue(row["reason"]),
		Notes:                stringValue(row["notes"]),
		CreatedAt:            timeValue(row["created_at"]),
		UpdatedAt:            timeValue(row["updated_at"]),
	}
}
