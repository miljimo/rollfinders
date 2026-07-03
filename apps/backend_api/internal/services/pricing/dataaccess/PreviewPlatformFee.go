package dataaccess

import (
	"context"

	"rollfinders/internal/services/pricing/domain"
)

func (repo *DatabaseRepository) PreviewPlatformFee(ctx context.Context, input PreviewPlatformFeeInput) (*domain.PlatformFeePreview, error) {
	rows, err := repo.db.Function(ctx, "pricing.preview_platform_fee", input.AmountMinor, input.ProviderID, input.Currency)
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	preview, err := PlatformFeePreviewFromFirst(rows)
	if err != nil {
		return nil, err
	}
	return &preview, nil
}
