package dataaccess

func PlatformFeeSettingFromRow(row map[string]interface{}) PlatformFeeSetting {
	return PlatformFeeSetting{
		PlatformFeeBasisPoints: int(int64Value(row["platform_fee_basis_points"])),
		PlatformFeeFixedMinor:  int64Value(row["platform_fee_fixed_minor"]),
		Currency:               stringValue(row["currency"]),
	}
}
