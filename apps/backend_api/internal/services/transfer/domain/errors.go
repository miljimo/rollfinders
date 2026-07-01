package domain

import "errors"

var (
	ErrInvalidAmount            = errors.New("transfer amount must be greater than zero")
	ErrInvalidCurrency          = errors.New("transfer currency must be GBP or Points")
	ErrInvalidWallet            = errors.New("source and destination wallet IDs are required and must be different")
	ErrIdempotencyRequired      = errors.New("idempotency key is required")
	ErrWalletTransferFailed     = errors.New("wallet transfer could not be initiated")
	ErrWalletServiceUnavailable = errors.New("wallet service is unavailable")
)
