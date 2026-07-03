package requests

import "rollfinders/internal/services/pricing/domain"

type PreviewPlatformFeeRequest struct {
	AmountMinor int64           `json:"amount_minor"`
	ProviderID  string          `json:"provider_id"`
	Currency    domain.Currency `json:"currency"`
}
