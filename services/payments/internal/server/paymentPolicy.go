package server

import (
	"context"
	"strconv"
	"strings"

	"payments/internal/dataaccess"
)

type platformFeeSetting struct {
	PlatformFeeBasisPoints int
	PlatformFeeFixedMinor  int64
	Currency               string
}

func defaultPlatformFeeSetting() platformFeeSetting {
	return platformFeeSetting{
		PlatformFeeBasisPoints: 500,
		PlatformFeeFixedMinor:  0,
		Currency:               "GBP",
	}
}

func (s *store) getPlatformFeeSetting() platformFeeSetting {
	if s.db != nil {
		setting, err := dataaccess.GetPlatformFeeSetting(context.Background(), s.db)
		if err == nil {
			return platformFeeSetting{
				PlatformFeeBasisPoints: setting.PlatformFeeBasisPoints,
				PlatformFeeFixedMinor:  setting.PlatformFeeFixedMinor,
				Currency:               strings.TrimSpace(setting.Currency),
			}
		}
	}
	return defaultPlatformFeeSetting()
}

func calculateApplicationFeeMinor(amountMinor int64, setting platformFeeSetting) int64 {
	if amountMinor <= 0 {
		return 0
	}
	percentageFee := (amountMinor*int64(setting.PlatformFeeBasisPoints) + 5000) / 10000
	fee := percentageFee + setting.PlatformFeeFixedMinor
	if fee < 0 {
		return 0
	}
	if fee > amountMinor {
		return amountMinor
	}
	return fee
}

func (s *server) applyCheckoutPaymentPolicy(metadata map[string]string, amountMinor int64, currency string) {
	if strings.TrimSpace(metadata["stripe_destination_account"]) == "" {
		delete(metadata, "stripe_application_fee_amount")
		return
	}

	setting := s.store.getPlatformFeeSetting()
	if setting.Currency != "" && !strings.EqualFold(setting.Currency, currency) {
		delete(metadata, "stripe_application_fee_amount")
		return
	}

	fee := calculateApplicationFeeMinor(amountMinor, setting)
	metadata["stripe_application_fee_amount"] = strconv.FormatInt(fee, 10)
	metadata["platform_fee_basis_points"] = strconv.Itoa(setting.PlatformFeeBasisPoints)
	metadata["platform_fee_fixed_minor"] = strconv.FormatInt(setting.PlatformFeeFixedMinor, 10)
}
