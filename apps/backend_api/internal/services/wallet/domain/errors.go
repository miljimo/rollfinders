package domain

import "errors"

var (
	ErrInvalidAmount       = errors.New("amount must be positive")
	ErrInvalidCurrency     = errors.New("currency must be GBP or Points")
	ErrInvalidOwner        = errors.New("wallet owner ID is required")
	ErrInvalidWalletType   = errors.New("wallet type must be internal or external")
	ErrInvalidWalletPair   = errors.New("source and destination wallet IDs are required and must be different")
	ErrWalletNotFound      = errors.New("wallet not found")
	ErrWalletInactive      = errors.New("wallet is not active")
	ErrWalletReadOnly      = errors.New("wallet is read-only")
	ErrCurrencyMismatch    = errors.New("wallet currencies must match")
	ErrInsufficientFunds   = errors.New("insufficient available balance")
	ErrIdempotencyRequired = errors.New("idempotency key is required")
	ErrTransactionNotFound = errors.New("transaction not found")
	ErrAlreadyReversed     = errors.New("transaction has already been reversed")
)
