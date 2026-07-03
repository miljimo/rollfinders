package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"rollfinders/internal/services/pricing/dataaccess"
	"rollfinders/internal/services/pricing/domain"
)

type fakeRepository struct {
	getInput     dataaccess.GetActivePlatformFeePolicyInput
	updateInput  dataaccess.UpdatePlatformFeePolicyInput
	previewInput dataaccess.PreviewPlatformFeeInput
}

func (repo *fakeRepository) GetActivePlatformFeePolicy(_ context.Context, input dataaccess.GetActivePlatformFeePolicyInput) (*domain.PlatformFeePolicy, error) {
	repo.getInput = input
	return testPolicy(input.ProviderID, input.Currency), nil
}

func (repo *fakeRepository) UpdatePlatformFeePolicy(_ context.Context, input dataaccess.UpdatePlatformFeePolicyInput) (*domain.PlatformFeePolicy, error) {
	repo.updateInput = input
	return testPolicy(input.ProviderID, input.Currency), nil
}

func (repo *fakeRepository) PreviewPlatformFee(_ context.Context, input dataaccess.PreviewPlatformFeeInput) (*domain.PlatformFeePreview, error) {
	repo.previewInput = input
	return &domain.PlatformFeePreview{AmountMinor: input.AmountMinor, ProviderID: input.ProviderID, Currency: input.Currency, PlatformFeeMinor: 600, NetAmountMinor: 9400}, nil
}

func testPolicy(providerID string, currency domain.Currency) *domain.PlatformFeePolicy {
	return &domain.PlatformFeePolicy{
		ID:                    "ppol_123",
		PolicyType:            domain.PolicyTypePlatformFee,
		ProviderID:            providerID,
		PercentageBasisPoints: 500,
		FixedAmountMinor:      100,
		Currency:              currency,
		Status:                domain.PolicyStatusActive,
		Version:               1,
		CreatedAt:             time.Now().UTC(),
		UpdatedAt:             time.Now().UTC(),
	}
}

func TestGetActivePlatformFeePolicyNormalizesInput(t *testing.T) {
	repo := &fakeRepository{}
	svc := New(repo)

	policy, err := svc.GetActivePlatformFeePolicy(context.Background(), dataaccess.GetActivePlatformFeePolicyInput{
		ProviderID: "  rollfinders-stripe-platform  ",
		Currency:   "gbp",
	})
	if err != nil {
		t.Fatalf("expected policy, got error %v", err)
	}
	if policy.ProviderID != "rollfinders-stripe-platform" || policy.Currency != domain.CurrencyGBP {
		t.Fatalf("unexpected policy normalization: %#v", policy)
	}
	if repo.getInput.ProviderID != "rollfinders-stripe-platform" || repo.getInput.Currency != domain.CurrencyGBP {
		t.Fatalf("repository received unnormalized input: %#v", repo.getInput)
	}
}

func TestUpdatePlatformFeePolicyValidation(t *testing.T) {
	svc := New(&fakeRepository{})

	_, err := svc.UpdatePlatformFeePolicy(context.Background(), dataaccess.UpdatePlatformFeePolicyInput{
		ProviderID:            "provider_1",
		PercentageBasisPoints: 10001,
		FixedAmountMinor:      100,
		Currency:              domain.CurrencyGBP,
	})
	if !errors.Is(err, domain.ErrInvalidPercentageBasisPoints) {
		t.Fatalf("expected invalid basis points, got %v", err)
	}

	_, err = svc.UpdatePlatformFeePolicy(context.Background(), dataaccess.UpdatePlatformFeePolicyInput{
		ProviderID:            "provider_1",
		PercentageBasisPoints: 500,
		FixedAmountMinor:      -1,
		Currency:              domain.CurrencyGBP,
	})
	if !errors.Is(err, domain.ErrInvalidFixedAmount) {
		t.Fatalf("expected invalid fixed amount, got %v", err)
	}
}

func TestPreviewPlatformFeeValidation(t *testing.T) {
	svc := New(&fakeRepository{})

	_, err := svc.PreviewPlatformFee(context.Background(), dataaccess.PreviewPlatformFeeInput{
		AmountMinor: -1,
		ProviderID:  "provider_1",
		Currency:    domain.CurrencyGBP,
	})
	if !errors.Is(err, domain.ErrInvalidAmount) {
		t.Fatalf("expected invalid amount, got %v", err)
	}
}
