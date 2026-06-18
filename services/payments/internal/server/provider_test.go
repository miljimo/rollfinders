package server

import (
	"os"
	"path/filepath"
	"testing"
)

func TestStripeAdapterMapsCreatePaymentStatuses(t *testing.T) {
	adapter := stripeAdapter{}
	result, err := adapter.CreatePayment(createPaymentRequest{
		Amount: 1299, Currency: "GBP", Provider: "stripe", PaymentMethodType: "card",
		Metadata: map[string]string{"requires_action": "true"},
	}, "idem-key")
	if err != nil {
		t.Fatal(err)
	}
	if result.Status != statusRequiresAction || result.NextAction["type"] == "" {
		t.Fatalf("unexpected stripe result: %+v", result)
	}
}

func TestPayPalAdapterReturnsApprovalAction(t *testing.T) {
	adapter := paypalAdapter{}
	result, err := adapter.CreatePayment(createPaymentRequest{Amount: 1299, Currency: "GBP", Provider: "paypal", PaymentMethodType: "paypal"}, "idem-key")
	if err != nil {
		t.Fatal(err)
	}
	if result.Status != statusRequiresAction || result.NextAction["url"] == "" {
		t.Fatalf("unexpected paypal result: %+v", result)
	}
}

func TestStripeAdapterReportsConfiguredCredentialsFromEnv(t *testing.T) {
	adapter := stripeAdapter{secret: stripeSecretResolver{envValue: "sk_test_123"}}
	result, err := adapter.CreatePayment(createPaymentRequest{
		Amount: 1299, Currency: "GBP", Provider: "stripe", PaymentMethodType: "card",
	}, "idem-key")
	if err != nil {
		t.Fatal(err)
	}
	if result.NextAction["provider_credentials"] != "configured" {
		t.Fatalf("expected configured credential marker, got %+v", result.NextAction)
	}
}

func TestStripeCheckoutMapsGooglePayToCardPaymentMethod(t *testing.T) {
	if got := stripeCheckoutPaymentMethodType("google_pay"); got != "card" {
		t.Fatalf("expected Google Pay to use Stripe card method, got %q", got)
	}
	if got := stripeCheckoutPaymentMethodType("card"); got != "card" {
		t.Fatalf("expected card method to remain card, got %q", got)
	}
}

func TestStripeSecretResolverRereadsFileForRotation(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "stripe_secret_key")
	if err := os.WriteFile(path, []byte("sk_test_old"), 0o600); err != nil {
		t.Fatal(err)
	}
	resolver := stripeSecretResolver{filePath: path}
	if got := resolver.value(); got != "sk_test_old" {
		t.Fatalf("expected old key, got %q", got)
	}
	if err := os.WriteFile(path, []byte("sk_test_new"), 0o600); err != nil {
		t.Fatal(err)
	}
	if got := resolver.value(); got != "sk_test_new" {
		t.Fatalf("expected rotated key, got %q", got)
	}
}

func TestStripeRefreshWithoutCredentialsKeepsCurrentPaymentState(t *testing.T) {
	payment := Payment{
		ID:                "pay_123",
		ProviderPaymentID: "cs_test_123",
		Status:            statusRequiresAction,
		ProviderRawStatus: "open",
		NextAction:        map[string]string{"type": "stripe_checkout"},
	}
	result, err := (stripeAdapter{}).Refresh(payment)
	if err != nil {
		t.Fatal(err)
	}
	if result.Status != statusRequiresAction || result.ProviderID != "cs_test_123" {
		t.Fatalf("unexpected refresh result: %+v", result)
	}
}

func TestWebhookSignatureRequired(t *testing.T) {
	if _, err := (stripeAdapter{}).ParseWebhook([]byte(`{"id":"evt_1"}`), map[string]string{}); err == nil {
		t.Fatal("expected stripe signature error")
	}
	if _, err := (paypalAdapter{}).ParseWebhook([]byte(`{"id":"evt_1"}`), map[string]string{}); err == nil {
		t.Fatal("expected paypal signature error")
	}
}
