package dataaccess

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"rollfinders/internal/core/databases"
	"rollfinders/internal/services/pricing/domain"
)

func First(rows databases.DBResults) (databases.DBRow, error) {
	if len(rows) == 0 {
		return nil, sql.ErrNoRows
	}
	return rows[0], nil
}

func PlatformFeePolicyFromFirst(rows databases.DBResults) (domain.PlatformFeePolicy, error) {
	row, err := First(rows)
	if err != nil {
		return domain.PlatformFeePolicy{}, err
	}
	return PlatformFeePolicyFromRow(row), nil
}

func PlatformFeePolicyFromRow(row databases.DBRow) domain.PlatformFeePolicy {
	return domain.PlatformFeePolicy{
		ID:                    String(row, "id"),
		PolicyType:            domain.PolicyType(String(row, "policy_type")),
		ProviderID:            String(row, "provider_id"),
		PercentageBasisPoints: int(Int64(row, "percentage_basis_points")),
		FixedAmountMinor:      Int64(row, "fixed_amount_minor"),
		Currency:              domain.Currency(String(row, "currency")),
		Status:                domain.PolicyStatus(String(row, "status")),
		Version:               int(Int64(row, "version")),
		CreatedBy:             String(row, "created_by"),
		UpdatedBy:             String(row, "updated_by"),
		CreatedAt:             Time(row, "created_at"),
		UpdatedAt:             Time(row, "updated_at"),
	}
}

func PlatformFeePreviewFromFirst(rows databases.DBResults) (domain.PlatformFeePreview, error) {
	row, err := First(rows)
	if err != nil {
		return domain.PlatformFeePreview{}, err
	}
	return domain.PlatformFeePreview{
		AmountMinor:           Int64(row, "amount_minor"),
		ProviderID:            String(row, "provider_id"),
		Currency:              domain.Currency(String(row, "currency")),
		PercentageBasisPoints: int(Int64(row, "percentage_basis_points")),
		FixedAmountMinor:      Int64(row, "fixed_amount_minor"),
		PercentageFeeMinor:    Int64(row, "percentage_fee_minor"),
		PlatformFeeMinor:      Int64(row, "platform_fee_minor"),
		NetAmountMinor:        Int64(row, "net_amount_minor"),
		PolicyID:              String(row, "policy_id"),
		PolicyVersion:         int(Int64(row, "policy_version")),
	}, nil
}

func String(row databases.DBRow, key string) string {
	value := row[key]
	if value == nil {
		return ""
	}
	if text, ok := value.(string); ok {
		return text
	}
	return fmt.Sprint(value)
}

func Int64(row databases.DBRow, key string) int64 {
	switch value := row[key].(type) {
	case int64:
		return value
	case int:
		return int64(value)
	case int32:
		return int64(value)
	case float64:
		return int64(value)
	default:
		return 0
	}
}

func Time(row databases.DBRow, key string) time.Time {
	if value, ok := row[key].(time.Time); ok {
		return value
	}
	return time.Time{}
}

func NormalizeCurrency(currency string) string {
	return strings.ToUpper(strings.TrimSpace(currency))
}
