package dataaccess

func PlatformFeeSettingFromRow(row map[string]interface{}) PlatformFeeSetting {
	return PlatformFeeSetting{
		PlatformFeeBasisPoints:         int(int64Value(row["platform_fee_basis_points"])),
		PlatformFeeFixedMinor:          int64Value(row["platform_fee_fixed_minor"]),
		StripeProcessingFeeBasisPoints: int(int64Value(row["stripe_processing_fee_basis_points"])),
		StripeProcessingFeeFixedMinor:  int64Value(row["stripe_processing_fee_fixed_minor"]),
		Currency:                       stringValue(row["currency"]),
	}
}
