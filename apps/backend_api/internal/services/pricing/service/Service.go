package service

import (
	"context"
	"strings"

	"rollfinders/internal/services/pricing/dataaccess"
	"rollfinders/internal/services/pricing/domain"
)

type Service struct {
	repo dataaccess.Repository
}

func New(repo dataaccess.Repository) *Service {
	return &Service{repo: repo}
}

func normalizeCurrency(currency domain.Currency) domain.Currency {
	return domain.Currency(dataaccess.NormalizeCurrency(string(currency)))
}

func validateProviderID(providerID string) error {
	if strings.TrimSpace(providerID) == "" {
		return domain.ErrInvalidProviderID
	}
	return nil
}

func validateCurrency(currency domain.Currency) error {
	if currency != domain.CurrencyGBP {
		return domain.ErrInvalidCurrency
	}
	return nil
}

func validatePercentageBasisPoints(value int) error {
	if value < 0 || value > 10000 {
		return domain.ErrInvalidPercentageBasisPoints
	}
	return nil
}

func validateFixedAmount(value int64) error {
	if value < 0 {
		return domain.ErrInvalidFixedAmount
	}
	return nil
}

func validateAmount(value int64) error {
	if value < 0 {
		return domain.ErrInvalidAmount
	}
	return nil
}

func (svc *Service) GetActivePlatformFeePolicy(ctx context.Context, input dataaccess.GetActivePlatformFeePolicyInput) (*domain.PlatformFeePolicy, error) {
	input.ProviderID = strings.TrimSpace(input.ProviderID)
	input.Currency = normalizeCurrency(input.Currency)
	if err := validateProviderID(input.ProviderID); err != nil {
		return nil, err
	}
	if err := validateCurrency(input.Currency); err != nil {
		return nil, err
	}
	return svc.repo.GetActivePlatformFeePolicy(ctx, input)
}

func (svc *Service) UpdatePlatformFeePolicy(ctx context.Context, input dataaccess.UpdatePlatformFeePolicyInput) (*domain.PlatformFeePolicy, error) {
	input.ProviderID = strings.TrimSpace(input.ProviderID)
	input.ActorUserID = strings.TrimSpace(input.ActorUserID)
	input.Currency = normalizeCurrency(input.Currency)
	if err := validateProviderID(input.ProviderID); err != nil {
		return nil, err
	}
	if err := validateCurrency(input.Currency); err != nil {
		return nil, err
	}
	if err := validatePercentageBasisPoints(input.PercentageBasisPoints); err != nil {
		return nil, err
	}
	if err := validateFixedAmount(input.FixedAmountMinor); err != nil {
		return nil, err
	}
	return svc.repo.UpdatePlatformFeePolicy(ctx, input)
}

func (svc *Service) PreviewPlatformFee(ctx context.Context, input dataaccess.PreviewPlatformFeeInput) (*domain.PlatformFeePreview, error) {
	input.ProviderID = strings.TrimSpace(input.ProviderID)
	input.Currency = normalizeCurrency(input.Currency)
	if err := validateProviderID(input.ProviderID); err != nil {
		return nil, err
	}
	if err := validateCurrency(input.Currency); err != nil {
		return nil, err
	}
	if err := validateAmount(input.AmountMinor); err != nil {
		return nil, err
	}
	return svc.repo.PreviewPlatformFee(ctx, input)
}
