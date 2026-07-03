package dataaccess

import (
	"context"

	"rollfinders/internal/services/pricing/domain"
)

func (repo *DatabaseRepository) UpdatePlatformFeePolicy(ctx context.Context, input UpdatePlatformFeePolicyInput) (*domain.PlatformFeePolicy, error) {
	rows, err := repo.db.Function(
		ctx,
		"pricing.update_platform_fee_policy",
		postgresID("ppol"),
		input.ProviderID,
		input.PercentageBasisPoints,
		input.FixedAmountMinor,
		input.Currency,
		input.ActorUserID,
	)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	policy, err := PlatformFeePolicyFromFirst(rows)
	if err != nil {
		return nil, err
	}
	return &policy, nil
}
