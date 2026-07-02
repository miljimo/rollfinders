package domain

import "errors"

var (
	ErrInvalidAmount                 = errors.New("transfer amount must be greater than zero")
	ErrInvalidCurrency               = errors.New("transfer currency must be GBP or Points")
	ErrInvalidWallet                 = errors.New("source and destination wallet IDs are required and must be different")
	ErrInvalidTransferUpdate         = errors.New("transfer status update is invalid")
	ErrInvalidTransferStatus         = errors.New("transfer status must be PROCESSING, COMPLETED, or FAILED")
	ErrIdempotencyRequired           = errors.New("idempotency key is required")
	ErrTransferNotFound              = errors.New("transfer was not found")
	ErrTransferRepositoryUnavailable = errors.New("transfer repository is unavailable")
)
