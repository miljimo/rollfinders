package dataaccess

import (
	"context"

	"rollfinders/internal/services/payments/databases"
)

func GetPlatformFeeSetting(ctx context.Context, db databases.DataContext) (PlatformFeeSetting, error) {
	rows, err := db.Function(ctx, `payments."platformFeeSettingGet"`)
	if err != nil {
		return PlatformFeeSetting{}, err
	}
	if len(rows) == 0 {
		return PlatformFeeSetting{}, ErrNotFound
	}
	return PlatformFeeSettingFromRow(rows[0]), nil
}
