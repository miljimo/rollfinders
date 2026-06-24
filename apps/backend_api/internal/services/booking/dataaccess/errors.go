package dataaccess

import "errors"

var (
	ErrConflict           = errors.New("booking conflict")
	ErrInvalidTransition  = errors.New("invalid booking status transition")
	ErrInvalidPaymentLink = errors.New("invalid booking payment link")
	ErrNotFound           = errors.New("booking not found")
)
