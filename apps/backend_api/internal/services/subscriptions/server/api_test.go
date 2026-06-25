package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestInferPlanChangeType(t *testing.T) {
	tests := []struct {
		name string
		from Plan
		to   Plan
		want string
	}{
		{
			name: "upgrade when target costs more",
			from: Plan{ID: "starter", PriceMinor: 2900},
			to:   Plan{ID: "pro", PriceMinor: 7900},
			want: "upgrade",
		},
		{
			name: "downgrade when target costs less",
			from: Plan{ID: "pro", PriceMinor: 7900},
			to:   Plan{ID: "starter", PriceMinor: 2900},
			want: "downgrade",
		},
		{
			name: "switch when target has same price",
			from: Plan{ID: "monthly-a", PriceMinor: 2900},
			to:   Plan{ID: "monthly-b", PriceMinor: 2900},
			want: "switch",
		},
		{
			name: "switch when target is current plan",
			from: Plan{ID: "pro", PriceMinor: 7900},
			to:   Plan{ID: "pro", PriceMinor: 7900},
			want: "switch",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := inferPlanChangeType(tt.from, tt.to); got != tt.want {
				t.Fatalf("inferPlanChangeType() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestValidPlanChangeType(t *testing.T) {
	for _, value := range []string{"subscribe", "upgrade", "downgrade", "switch", "cancel", "reactivate"} {
		if !validPlanChangeType(value) {
			t.Fatalf("validPlanChangeType(%q) = false, want true", value)
		}
	}
	for _, value := range []string{"", "pause", "UPGRADE"} {
		if validPlanChangeType(value) {
			t.Fatalf("validPlanChangeType(%q) = true, want false", value)
		}
	}
}

func TestStripeBillingCycleHelpers(t *testing.T) {
	if !stripeBillableCycle("month") || !stripeBillableCycle("year") {
		t.Fatal("month and year billing cycles must be billable")
	}
	for _, value := range []string{"free", "manual", "", "week"} {
		if stripeBillableCycle(value) {
			t.Fatalf("stripeBillableCycle(%q) = true, want false", value)
		}
	}
	if got := stripeRecurringInterval("year"); got != "year" {
		t.Fatalf("stripeRecurringInterval(year) = %q, want year", got)
	}
	if got := stripeRecurringInterval("month"); got != "month" {
		t.Fatalf("stripeRecurringInterval(month) = %q, want month", got)
	}
}

func TestRedactBillingProviderError(t *testing.T) {
	body := []byte(`{"error":{"type":"invalid_request_error","code":"resource_missing","message":"No such price"}}`)
	got := redactBillingProviderError(body)
	if !strings.Contains(got, "invalid_request_error") || !strings.Contains(got, "resource_missing") || !strings.Contains(got, "No such price") {
		t.Fatalf("redactBillingProviderError() = %q", got)
	}
	if got := redactBillingProviderError([]byte(`not-json`)); got != "provider_error" {
		t.Fatalf("redactBillingProviderError(invalid) = %q, want provider_error", got)
	}
}

func TestPaymentSubscriptionCheckoutClient(t *testing.T) {
	var received paymentBillingSubscriptionRequest
	paymentService := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/v1/billing/subscriptions" {
			t.Fatalf("unexpected payment service request %s %s", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("Idempotency-Key"); got != "subscription-billing-client-test" {
			t.Fatalf("Idempotency-Key = %q, want subscription-billing-client-test", got)
		}
		if err := json.NewDecoder(r.Body).Decode(&received); err != nil {
			t.Fatal(err)
		}
		writeJSON(w, http.StatusCreated, paymentBillingSubscriptionResponse{
			ID:          "bill_sub_123",
			CheckoutURL: "https://checkout.stripe.com/pay/bill_sub_123",
			Provider:    "stripe",
		})
	}))
	defer paymentService.Close()

	client := paymentBillingClient{baseURL: paymentService.URL, client: paymentService.Client()}
	session, err := client.createSubscriptionCheckout(subscriptionCheckoutRequest{
		PlanID:         "plan_test",
		CustomerEmail:  "billing@example.com",
		SuccessURL:     "http://localhost:3000/dashboard/subscriptions?billing=success",
		CancelURL:      "http://localhost:3000/dashboard/subscriptions?billing=cancelled",
		IdempotencyKey: "subscription-billing-client-test",
		PlanChangeID:   "plan_change_test",
	}, Subscription{
		ID:        "sub_test",
		OwnerType: "application",
		OwnerID:   "app_rollfinders",
	}, Plan{
		ID:           "plan_test",
		Name:         "RollFinders Subscription Billing Test",
		Currency:     "GBP",
		PriceMinor:   100,
		BillingCycle: "month",
	})
	if err != nil {
		t.Fatal(err)
	}
	if session.ID != "bill_sub_123" {
		t.Fatalf("session id = %q, want bill_sub_123", session.ID)
	}
	if !strings.HasPrefix(session.URL, "https://checkout.stripe.com/") {
		t.Fatalf("session URL = %q, want Stripe Checkout URL", session.URL)
	}
	if received.ClientID != "rollfinders" || received.Provider != "stripe" || received.Interval != "month" {
		t.Fatalf("unexpected payment billing request: %+v", received)
	}
	if received.Metadata["subscription_id"] != "sub_test" || received.Metadata["plan_change_id"] != "plan_change_test" {
		t.Fatalf("expected subscription metadata on payment billing request, got %+v", received.Metadata)
	}
}

func TestFeatureNameUniqueWithinProductServiceContract(t *testing.T) {
	schema, err := os.ReadFile("../../../../migrations/subscriptions/001_core_schema.sql")
	if err != nil {
		t.Fatal(err)
	}
	repository, err := os.ReadFile("repository.go")
	if err != nil {
		t.Fatal(err)
	}
	schemaSource := string(schema)
	repositorySource := string(repository)
	if !strings.Contains(schemaSource, "subscriptions_product_features_product_name_key") {
		t.Fatal("product feature schema must enforce a unique feature name per product service")
	}
	if !strings.Contains(schemaSource, "product_features(product_id, lower(name))") {
		t.Fatal("product feature uniqueness must be scoped to product_id and case-insensitive name")
	}
	if !strings.Contains(repositorySource, "AND lower(name) = lower($2)") || !strings.Contains(repositorySource, "return ProductFeature{}, errDuplicate") {
		t.Fatal("repository must reject duplicate feature names in the same product service before upsert")
	}
}

func TestProductPatchSubscriptionTargetingContract(t *testing.T) {
	schema, err := os.ReadFile("../../../../migrations/subscriptions/001_core_schema.sql")
	if err != nil {
		t.Fatal(err)
	}
	repository, err := os.ReadFile("repository.go")
	if err != nil {
		t.Fatal(err)
	}
	api, err := os.ReadFile("api.go")
	if err != nil {
		t.Fatal(err)
	}
	server, err := os.ReadFile("server.go")
	if err != nil {
		t.Fatal(err)
	}

	schemaSource := string(schema)
	repositorySource := string(repository)
	apiSource := string(api)
	serverSource := string(server)

	for _, required := range []string{
		"CREATE TABLE IF NOT EXISTS subscriptions.subscription_owner_policies",
		"owner_type text NOT NULL UNIQUE",
		"subscription_supported boolean NOT NULL DEFAULT false",
		"subscription_required boolean NOT NULL DEFAULT false",
		"default_plan_id text",
		"'academy'",
		"'organisation'",
		"'practitioner'",
		"'platform'",
		"'application'",
	} {
		if !strings.Contains(schemaSource, required) {
			t.Fatalf("subscription schema must include productPatch owner policy contract fragment %q", required)
		}
	}

	for _, required := range []string{
		"feature_key text",
		"subscription_controlled boolean NOT NULL DEFAULT false",
		"academy.profile.manage",
		"payment.accept_online",
		"course.create",
		"course.update",
		"course.delete",
		"booking.create",
		"analytics.view",
	} {
		if !strings.Contains(schemaSource, required) {
			t.Fatalf("subscription schema must include feature entitlement contract fragment %q", required)
		}
	}

	for _, source := range []struct {
		name string
		body string
	}{
		{name: "repository", body: repositorySource},
		{name: "api", body: apiSource},
	} {
		if !strings.Contains(source.body, "FeatureKey") || !strings.Contains(source.body, `json:"feature_key"`) {
			t.Fatalf("%s must expose stable feature_key for gateway entitlement evaluation", source.name)
		}
		if !strings.Contains(source.body, "SubscriptionControlled") || !strings.Contains(source.body, `json:"subscription_controlled"`) {
			t.Fatalf("%s must expose subscription_controlled for IAM-only versus subscription-enforced decisions", source.name)
		}
	}

	for _, required := range []string{
		"owner_type",
		"feature_key",
		"subscription_controlled",
		"SUBSCRIPTION_REQUIRED",
		"PLAN_FEATURE_NOT_INCLUDED",
	} {
		if !strings.Contains(apiSource, required) && !strings.Contains(repositorySource, required) && !strings.Contains(serverSource, required) {
			t.Fatalf("entitlement decision surface must include %q for API gateway enforcement", required)
		}
	}
}
