package dataaccess

import (
	"context"
	"database/sql"
	"errors"

	"rollfinders/internal/services/pricing/domain"
)

func (repo *DatabaseRepository) GetActivePlatformFeePolicy(ctx context.Context, input GetActivePlatformFeePolicyInput) (*domain.PlatformFeePolicy, error) {
	rows, err := repo.db.Function(ctx, "pricing.get_active_platform_fee_policy", input.ProviderID, input.Currency)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	policy, err := PlatformFeePolicyFromFirst(rows)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrPolicyNotFound
	}
	if err != nil {
		return nil, err
	}
	return &policy, nil
}
