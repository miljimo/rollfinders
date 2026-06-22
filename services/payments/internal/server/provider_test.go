package server

import (
	"net/http"
	"net/url"
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

func TestStripeConnectMetadataMapsToDestinationChargeParams(t *testing.T) {
	form := url.Values{}

	applyStripeConnectFormParams(form, map[string]string{
		"stripe_destination_account":    "acct_academy",
		"stripe_application_fee_amount": "50",
	})

	if got := form.Get("payment_intent_data[transfer_data][destination]"); got != "acct_academy" {
		t.Fatalf("expected destination account param, got %q", got)
	}
	if got := form.Get("payment_intent_data[application_fee_amount]"); got != "50" {
		t.Fatalf("expected application fee amount param, got %q", got)
	}
}

func TestPaymentPolicyCalculatesApplicationFeeInService(t *testing.T) {
	if got := calculateApplicationFeeMinor(1000, platformFeeSetting{PlatformFeeBasisPoints: 500, PlatformFeeFixedMinor: 30}); got != 80 {
		t.Fatalf("expected 5 percent plus fixed fee to be 80, got %d", got)
	}
	if got := calculateApplicationFeeMinor(100, platformFeeSetting{PlatformFeeBasisPoints: 10000, PlatformFeeFixedMinor: 30}); got != 100 {
		t.Fatalf("expected application fee to be capped by amount, got %d", got)
	}
}

func TestPaymentPolicyOverridesClientSuppliedApplicationFee(t *testing.T) {
	srv := &server{store: newStore("")}
	metadata := map[string]string{
		"stripe_destination_account":    "acct_academy",
		"stripe_application_fee_amount": "9999",
	}

	srv.applyCheckoutPaymentPolicy(metadata, 1000, "GBP")

	if got := metadata["stripe_application_fee_amount"]; got != "50" {
		t.Fatalf("expected service-owned 5 percent application fee, got %q", got)
	}
	if got := metadata["platform_fee_basis_points"]; got != "500" {
		t.Fatalf("expected fee policy metadata, got %q", got)
	}
}

func TestPaymentPolicyRemovesApplicationFeeWithoutDestination(t *testing.T) {
	srv := &server{store: newStore("")}
	metadata := map[string]string{"stripe_application_fee_amount": "9999"}

	srv.applyCheckoutPaymentPolicy(metadata, 1000, "GBP")

	if _, ok := metadata["stripe_application_fee_amount"]; ok {
		t.Fatal("expected application fee metadata to be removed without a destination account")
	}
}

func TestStripeAdapterSetsVersionAndContextHeaders(t *testing.T) {
	req, err := http.NewRequest(http.MethodGet, "https://api.stripe.com/v1/balance", nil)
	if err != nil {
		t.Fatal(err)
	}
	adapter := stripeAdapter{apiVersion: "2024-09-30.acacia", context: "acct_123"}

	adapter.setRequestHeaders(req)

	if got := req.Header.Get("Stripe-Version"); got != "2024-09-30.acacia" {
		t.Fatalf("expected Stripe-Version header, got %q", got)
	}
	if got := req.Header.Get("Stripe-Context"); got != "acct_123" {
		t.Fatalf("expected Stripe-Context header, got %q", got)
	}
}

func TestStripeAdapterOmitsBlankContextHeader(t *testing.T) {
	req, err := http.NewRequest(http.MethodGet, "https://api.stripe.com/v1/balance", nil)
	if err != nil {
		t.Fatal(err)
	}
	adapter := stripeAdapter{apiVersion: "2024-09-30.acacia"}

	adapter.setRequestHeaders(req)

	if got := req.Header.Get("Stripe-Version"); got != "2024-09-30.acacia" {
		t.Fatalf("expected Stripe-Version header, got %q", got)
	}
	if got := req.Header.Get("Stripe-Context"); got != "" {
		t.Fatalf("expected blank Stripe-Context header, got %q", got)
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

func TestStripeCheckoutExpireTreatsMissingOrExpiredSessionsAsCancelled(t *testing.T) {
	cases := []string{
		`{"error":{"code":"resource_missing","message":"No such checkout.session: cs_test_123"}}`,
		`{"error":{"message":"This Checkout Session is already expired."}}`,
	}
	for _, body := range cases {
		if !stripeCheckoutExpireCanBeTreatedAsCancelled([]byte(body)) {
			t.Fatalf("expected cancellation-tolerant Stripe error for %s", body)
		}
	}
}

func TestStripeCheckoutExpireDetectsCompletedSessions(t *testing.T) {
	body := `{"error":{"message":"Only Checkout Sessions with a status in [\"open\"] can be expired. This Checkout Session has a status of ` + "`complete`" + `."}}`
	if !stripeCheckoutExpireMeansCheckoutCompleted([]byte(body)) {
		t.Fatal("expected completed checkout session to be detected")
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
