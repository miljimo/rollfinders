package server

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"
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

func TestStripeSubscriptionCheckoutSandbox(t *testing.T) {
	if os.Getenv("RUN_SUBSCRIPTION_BILLING_E2E") != "1" {
		t.Skip("set RUN_SUBSCRIPTION_BILLING_E2E=1 to create a Stripe test checkout session")
	}
	key := os.Getenv("STRIPE_SECRET_KEY")
	if key == "" {
		key = os.Getenv("PAYMENT_GATEWAY_API_KEY")
	}
	if !strings.HasPrefix(key, "sk_test_") {
		t.Fatal("subscription billing e2e requires a Stripe test secret key")
	}
	client := stripeBillingClient{secretKey: key, apiVersion: "2024-09-30.acacia"}
	session, err := client.createSubscriptionCheckout(subscriptionCheckoutRequest{
		PlanID:         "plan_e2e",
		CustomerEmail:  "billing-e2e@example.com",
		SuccessURL:     "http://localhost:3000/dashboard/subscriptions?billing=success",
		CancelURL:      "http://localhost:3000/dashboard/subscriptions?billing=cancelled",
		IdempotencyKey: fmt.Sprintf("subscription-billing-e2e-%d", time.Now().UnixNano()),
		PlanChangeID:   "plan_change_e2e",
	}, Subscription{
		ID:        "sub_e2e",
		OwnerType: "application",
		OwnerID:   "app_rollfinders",
	}, Plan{
		ID:           "plan_e2e",
		Name:         "RollFinders Subscription Billing E2E",
		Description:  "Automated subscription billing integration test.",
		Currency:     "GBP",
		PriceMinor:   100,
		BillingCycle: "month",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(session.ID, "cs_test_") {
		t.Fatalf("session id = %q, want Stripe test checkout session", session.ID)
	}
	if !strings.HasPrefix(session.URL, "https://checkout.stripe.com/") {
		t.Fatalf("session URL = %q, want Stripe Checkout URL", session.URL)
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
