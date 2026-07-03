package domain

import "errors"

var (
	ErrPolicyNotFound               = errors.New("pricing policy not found")
	ErrInvalidPolicyType            = errors.New("pricing policy type is invalid")
	ErrInvalidProviderID            = errors.New("provider ID is required")
	ErrInvalidCurrency              = errors.New("currency must be GBP")
	ErrInvalidPercentageBasisPoints = errors.New("percentage basis points must be between 0 and 10000")
	ErrInvalidFixedAmount           = errors.New("fixed amount minor must be greater than or equal to 0")
	ErrInvalidAmount                = errors.New("amount minor must be greater than or equal to 0")
)
