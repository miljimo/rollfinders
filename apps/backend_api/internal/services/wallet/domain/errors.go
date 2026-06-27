package domain

import "errors"

var (
	ErrInvalidAmount       = errors.New("amount must be positive")
	ErrInvalidCurrency     = errors.New("currency must be a three-letter ISO currency")
	ErrWalletNotFound      = errors.New("wallet not found")
	ErrWalletInactive      = errors.New("wallet is not active")
	ErrWalletReadOnly      = errors.New("wallet is read-only")
	ErrCurrencyMismatch    = errors.New("wallet currencies must match")
	ErrInsufficientFunds   = errors.New("insufficient available balance")
	ErrIdempotencyRequired = errors.New("idempotency key is required")
	ErrReservationNotFound = errors.New("reservation not found")
	ErrReservationInactive = errors.New("reservation is not active")
	ErrTransactionNotFound = errors.New("transaction not found")
	ErrAlreadyReversed     = errors.New("transaction has already been reversed")
)
