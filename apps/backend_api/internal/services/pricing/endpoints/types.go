package endpoints

import (
	"errors"
	"net/http"

	"rollfinders/internal/core/handlers"
	"rollfinders/internal/services/pricing/domain"
)

func pricingStatusError(err error) error {
	switch {
	case errors.Is(err, domain.ErrPolicyNotFound):
		return handlers.NewStatusError(http.StatusNotFound, "pricing_policy_not_found", err.Error(), err, nil)
	case errors.Is(err, domain.ErrInvalidPolicyType), errors.Is(err, domain.ErrInvalidProviderID), errors.Is(err, domain.ErrInvalidCurrency), errors.Is(err, domain.ErrInvalidPercentageBasisPoints), errors.Is(err, domain.ErrInvalidFixedAmount), errors.Is(err, domain.ErrInvalidAmount):
		return handlers.NewStatusError(http.StatusBadRequest, "validation_error", err.Error(), err, nil)
	default:
		return handlers.NewStatusError(http.StatusInternalServerError, "pricing_error", "Pricing request could not be completed.", err, nil)
	}
}
