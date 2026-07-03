package dataaccess

import (
	"context"

	"rollfinders/internal/services/pricing/domain"
)

type GetActivePlatformFeePolicyInput struct {
	ProviderID string
	Currency   domain.Currency
}

type UpdatePlatformFeePolicyInput struct {
	ProviderID            string
	PercentageBasisPoints int
	FixedAmountMinor      int64
	Currency              domain.Currency
	ActorUserID           string
}

type PreviewPlatformFeeInput struct {
	AmountMinor int64
	ProviderID  string
	Currency    domain.Currency
}

type Repository interface {
	GetActivePlatformFeePolicy(ctx context.Context, input GetActivePlatformFeePolicyInput) (*domain.PlatformFeePolicy, error)
	UpdatePlatformFeePolicy(ctx context.Context, input UpdatePlatformFeePolicyInput) (*domain.PlatformFeePolicy, error)
	PreviewPlatformFee(ctx context.Context, input PreviewPlatformFeeInput) (*domain.PlatformFeePreview, error)
}
