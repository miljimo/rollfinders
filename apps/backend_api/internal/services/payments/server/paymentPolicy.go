package server

import (
	"context"
	"math"
	"strconv"
	"strings"

	"rollfinders/internal/services/payments/dataaccess"
)

type platformFeeSetting struct {
	PlatformFeeBasisPoints         int
	PlatformFeeFixedMinor          int64
	StripeProcessingFeeBasisPoints int
	StripeProcessingFeeFixedMinor  int64
	Currency                       string
}

func defaultPlatformFeeSetting() platformFeeSetting {
	return platformFeeSetting{
		PlatformFeeBasisPoints:         500,
		PlatformFeeFixedMinor:          0,
		StripeProcessingFeeBasisPoints: 290,
		StripeProcessingFeeFixedMinor:  30,
		Currency:                       "GBP",
	}
}

func (s *store) getPlatformFeeSetting() platformFeeSetting {
	if s.db != nil {
		setting, err := dataaccess.GetPlatformFeeSetting(context.Background(), s.db)
		if err == nil {
			return platformFeeSetting{
				PlatformFeeBasisPoints:         setting.PlatformFeeBasisPoints,
				PlatformFeeFixedMinor:          setting.PlatformFeeFixedMinor,
				StripeProcessingFeeBasisPoints: setting.StripeProcessingFeeBasisPoints,
				StripeProcessingFeeFixedMinor:  setting.StripeProcessingFeeFixedMinor,
				Currency:                       strings.TrimSpace(setting.Currency),
			}
		}
	}
	return defaultPlatformFeeSetting()
}

func calculateApplicationFeeMinor(amountMinor int64, setting platformFeeSetting) int64 {
	if amountMinor <= 0 {
		return 0
	}
	setting = withDefaultStripeProcessingFee(setting)
	commissionFee := calculatePercentageFeeMinor(amountMinor, setting.PlatformFeeBasisPoints) + setting.PlatformFeeFixedMinor
	processingFee := calculateStripeProcessingFeeMinor(amountMinor, setting)
	fee := commissionFee + processingFee
	if fee < 0 {
		return 0
	}
	if fee > amountMinor {
		return amountMinor
	}
	return fee
}

func calculateRollFindersCommissionMinor(amountMinor int64, setting platformFeeSetting) int64 {
	if amountMinor <= 0 {
		return 0
	}
	fee := calculatePercentageFeeMinor(amountMinor, setting.PlatformFeeBasisPoints) + setting.PlatformFeeFixedMinor
	if fee < 0 {
		return 0
	}
	if fee > amountMinor {
		return amountMinor
	}
	return fee
}

func calculateStripeProcessingFeeMinor(amountMinor int64, setting platformFeeSetting) int64 {
	if amountMinor <= 0 {
		return 0
	}
	setting = withDefaultStripeProcessingFee(setting)
	percentageFee := calculatePercentageFeeMinor(amountMinor, setting.StripeProcessingFeeBasisPoints)
	fee := percentageFee + setting.StripeProcessingFeeFixedMinor
	if fee < 0 {
		return 0
	}
	if fee > amountMinor {
		return amountMinor
	}
	return fee
}

func calculatePercentageFeeMinor(amountMinor int64, basisPoints int) int64 {
	if amountMinor <= 0 || basisPoints <= 0 {
		return 0
	}
	return int64(math.Ceil(float64(amountMinor*int64(basisPoints)) / 10000.0))
}

func withDefaultStripeProcessingFee(setting platformFeeSetting) platformFeeSetting {
	if setting.StripeProcessingFeeBasisPoints <= 0 {
		setting.StripeProcessingFeeBasisPoints = 290
	}
	if setting.StripeProcessingFeeFixedMinor <= 0 {
		setting.StripeProcessingFeeFixedMinor = 30
	}
	return setting
}

func (s *server) applyCheckoutPaymentPolicy(metadata map[string]string, amountMinor int64, currency string) {
	if strings.TrimSpace(metadata["stripe_destination_account"]) == "" {
		delete(metadata, "stripe_application_fee_amount")
		delete(metadata, "rollfinders_commission_amount")
		delete(metadata, "stripe_processing_fee_amount")
		return
	}

	setting := s.store.getPlatformFeeSetting()
	if setting.Currency != "" && !strings.EqualFold(setting.Currency, currency) {
		delete(metadata, "stripe_application_fee_amount")
		delete(metadata, "rollfinders_commission_amount")
		delete(metadata, "stripe_processing_fee_amount")
		return
	}

	fee := calculateApplicationFeeMinor(amountMinor, setting)
	commission := calculateRollFindersCommissionMinor(amountMinor, setting)
	processingFee := calculateStripeProcessingFeeMinor(amountMinor, setting)
	metadata["stripe_application_fee_amount"] = strconv.FormatInt(fee, 10)
	metadata["rollfinders_commission_amount"] = strconv.FormatInt(commission, 10)
	metadata["stripe_processing_fee_amount"] = strconv.FormatInt(processingFee, 10)
	metadata["stripe_processing_fee_basis_points"] = strconv.Itoa(setting.StripeProcessingFeeBasisPoints)
	metadata["stripe_processing_fee_fixed_minor"] = strconv.FormatInt(setting.StripeProcessingFeeFixedMinor, 10)
	metadata["platform_fee_basis_points"] = strconv.Itoa(setting.PlatformFeeBasisPoints)
	metadata["platform_fee_fixed_minor"] = strconv.FormatInt(setting.PlatformFeeFixedMinor, 10)
}
