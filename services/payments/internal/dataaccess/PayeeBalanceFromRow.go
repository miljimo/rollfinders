package dataaccess

func PayeeBalanceFromRow(row map[string]interface{}) PayeeBalance {
	return PayeeBalance{
		PayeeID:                stringValue(row["payee_id"]),
		ClientID:               stringValue(row["client_id"]),
		Currency:               stringValue(row["currency"]),
		GrossPaidAmount:        int64Value(row["gross_paid_amount"]),
		PlatformFeeAmount:      int64Value(row["platform_fee_amount"]),
		RefundedAmount:         int64Value(row["refunded_amount"]),
		HeldAmount:             int64Value(row["held_amount"]),
		PendingPayoutAmount:    int64Value(row["pending_payout_amount"]),
		PaidPayoutAmount:       int64Value(row["paid_payout_amount"]),
		AvailablePayoutAmount:  int64Value(row["available_payout_amount"]),
		MinimumPayoutAmount:    int64Value(row["minimum_payout_amount"]),
		PayoutDestinationReady: boolValue(row["payout_destination_ready"]),
	}
}
