package pricing

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"rollfinders/internal/services/pricing/config"
	"rollfinders/internal/services/pricing/dataaccess"
	"rollfinders/internal/services/pricing/domain"
)

type serverTestRepository struct {
	updatedBy string
}

func (repo *serverTestRepository) GetActivePlatformFeePolicy(_ context.Context, input dataaccess.GetActivePlatformFeePolicyInput) (*domain.PlatformFeePolicy, error) {
	return serverTestPolicy(input.ProviderID, input.Currency), nil
}

func (repo *serverTestRepository) UpdatePlatformFeePolicy(_ context.Context, input dataaccess.UpdatePlatformFeePolicyInput) (*domain.PlatformFeePolicy, error) {
	repo.updatedBy = input.ActorUserID
	policy := serverTestPolicy(input.ProviderID, input.Currency)
	policy.PercentageBasisPoints = input.PercentageBasisPoints
	policy.FixedAmountMinor = input.FixedAmountMinor
	policy.UpdatedBy = input.ActorUserID
	return policy, nil
}

func (repo *serverTestRepository) PreviewPlatformFee(_ context.Context, input dataaccess.PreviewPlatformFeeInput) (*domain.PlatformFeePreview, error) {
	return &domain.PlatformFeePreview{
		AmountMinor:           input.AmountMinor,
		ProviderID:            input.ProviderID,
		Currency:              input.Currency,
		PercentageBasisPoints: 500,
		FixedAmountMinor:      100,
		PercentageFeeMinor:    500,
		PlatformFeeMinor:      600,
		NetAmountMinor:        9400,
		PolicyID:              "ppol_123",
		PolicyVersion:         1,
	}, nil
}

func serverTestPolicy(providerID string, currency domain.Currency) *domain.PlatformFeePolicy {
	return &domain.PlatformFeePolicy{
		ID:                    "ppol_123",
		PolicyType:            domain.PolicyTypePlatformFee,
		ProviderID:            providerID,
		PercentageBasisPoints: 500,
		FixedAmountMinor:      100,
		Currency:              currency,
		Status:                domain.PolicyStatusActive,
		Version:               1,
		CreatedAt:             time.Date(2026, 7, 3, 10, 0, 0, 0, time.UTC),
		UpdatedAt:             time.Date(2026, 7, 3, 10, 0, 0, 0, time.UTC),
	}
}

func TestPricingServerGetUpdateAndPreview(t *testing.T) {
	repo := &serverTestRepository{}
	handler := New(Options{Config: config.Config{MetricsEnabled: true}, Repo: repo})

	getResponse := requestJSON(t, handler, http.MethodGet, "/v1/pricing/policies/platform-fee?provider_id=rollfinders-stripe-platform&currency=GBP", nil, "")
	if getResponse["policy"].(map[string]interface{})["provider_id"] != "rollfinders-stripe-platform" {
		t.Fatalf("expected policy response, got %#v", getResponse)
	}

	updateResponse := requestJSON(t, handler, http.MethodPut, "/v1/pricing/policies/platform-fee", map[string]interface{}{
		"provider_id":             "rollfinders-stripe-platform",
		"percentage_basis_points": 250,
		"fixed_amount_minor":      50,
		"currency":                "GBP",
	}, "user_123")
	if repo.updatedBy != "user_123" {
		t.Fatalf("expected actor header to be passed to service, got %q", repo.updatedBy)
	}
	if updateResponse["policy"].(map[string]interface{})["percentage_basis_points"].(float64) != 250 {
		t.Fatalf("expected updated policy response, got %#v", updateResponse)
	}

	previewResponse := requestJSON(t, handler, http.MethodPost, "/v1/pricing/policies/platform-fee/preview", map[string]interface{}{
		"amount_minor": 10000,
		"provider_id":  "rollfinders-stripe-platform",
		"currency":     "GBP",
	}, "")
	if previewResponse["preview"].(map[string]interface{})["platform_fee_minor"].(float64) != 600 {
		t.Fatalf("expected preview response, got %#v", previewResponse)
	}
}

func requestJSON(t *testing.T, handler http.Handler, method string, path string, body map[string]interface{}, actorID string) map[string]interface{} {
	t.Helper()
	var payload bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&payload).Encode(body); err != nil {
			t.Fatalf("encode request: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &payload)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if actorID != "" {
		req.Header.Set("X-Actor-User-ID", actorID)
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code < 200 || rec.Code >= 300 {
		t.Fatalf("%s %s returned %d: %s", method, path, rec.Code, rec.Body.String())
	}
	var decoded map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return decoded
}
