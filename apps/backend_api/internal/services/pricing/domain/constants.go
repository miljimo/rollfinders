package domain

type PolicyType string
type PolicyStatus string
type Currency string

const (
	PolicyTypePlatformFee PolicyType = "PLATFORM_FEE"
)

const (
	PolicyStatusActive   PolicyStatus = "ACTIVE"
	PolicyStatusInactive PolicyStatus = "INACTIVE"
)

const (
	CurrencyGBP Currency = "GBP"
)
