package endpoints

import (
	"errors"
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/transfer/domain"
)

func transferStatusError(err error) error {
	switch {
	case errors.Is(err, domain.ErrTransferNotFound):
		return handlers.NewStatusError(http.StatusNotFound, "transfer_not_found", err.Error(), err, nil)
	case errors.Is(err, domain.ErrInvalidAmount), errors.Is(err, domain.ErrInvalidCurrency), errors.Is(err, domain.ErrInvalidWallet), errors.Is(err, domain.ErrIdempotencyRequired), errors.Is(err, domain.ErrInvalidTransferUpdate), errors.Is(err, domain.ErrInvalidTransferStatus):
		return handlers.NewStatusError(http.StatusBadRequest, "validation_error", err.Error(), err, nil)
	case errors.Is(err, domain.ErrTransferRepositoryUnavailable):
		return handlers.NewStatusError(http.StatusServiceUnavailable, "transfer_repository_unavailable", err.Error(), err, nil)
	default:
		return handlers.NewStatusError(http.StatusInternalServerError, "transfer_error", "Transfer request could not be completed.", err, nil)
	}
}
