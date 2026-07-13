package endpoints

import (
	"errors"
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/wallet/domain"
)

func walletStatusError(err error) error {
	switch {
	case errors.Is(err, domain.ErrWalletNotFound), errors.Is(err, domain.ErrTransactionNotFound), errors.Is(err, domain.ErrReservationNotFound):
		return handlers.NewStatusError(http.StatusNotFound, "not_found", err.Error(), err, nil)
	case errors.Is(err, domain.ErrInvalidAmount), errors.Is(err, domain.ErrInvalidCurrency), errors.Is(err, domain.ErrInvalidOwner), errors.Is(err, domain.ErrInvalidWalletType), errors.Is(err, domain.ErrInvalidWalletPair), errors.Is(err, domain.ErrIdempotencyRequired), errors.Is(err, domain.ErrInvalidProvider), errors.Is(err, domain.ErrInvalidConnectionType), errors.Is(err, domain.ErrInvalidLinkedAccountStatus):
		return handlers.NewStatusError(http.StatusBadRequest, "validation_error", err.Error(), err, nil)
	case errors.Is(err, domain.ErrDuplicateWallet):
		return handlers.NewStatusError(http.StatusConflict, "duplicate_wallet", err.Error(), err, nil)
	case errors.Is(err, domain.ErrWalletInactive), errors.Is(err, domain.ErrWalletReadOnly), errors.Is(err, domain.ErrCurrencyMismatch), errors.Is(err, domain.ErrInsufficientFunds), errors.Is(err, domain.ErrAlreadyReversed), errors.Is(err, domain.ErrReservationClosed):
		return handlers.NewStatusError(http.StatusConflict, "business_rule_violation", err.Error(), err, nil)
	default:
		return handlers.NewStatusError(http.StatusInternalServerError, "wallet_error", "Wallet request could not be completed.", err, nil)
	}
}
