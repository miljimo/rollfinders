package requests

import "rollfinders/internal/services/pricing/domain"

type UpdatePlatformFeePolicyRequest struct {
	ProviderID            string          `json:"provider_id"`
	PercentageBasisPoints int             `json:"percentage_basis_points"`
	FixedAmountMinor      int64           `json:"fixed_amount_minor"`
	Currency              domain.Currency `json:"currency"`
}
