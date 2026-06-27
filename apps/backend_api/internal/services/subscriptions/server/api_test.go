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
	if received.Metadata["resource_type"] != "subscription_plan_change" || received.Metadata["resource_id"] != "plan_change_test" {
		t.Fatalf("expected generic subscription plan-change resource metadata, got %+v", received.Metadata)
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

func TestSubscriptionOpenAPIContractExists(t *testing.T) {
	contract, err := os.ReadFile("../../../../../../docs/services/subscriptions/api/openApi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	source := string(contract)
	for _, required := range []string{
		"openapi: 3.1.0",
		"/healthz:",
		"/readyz:",
		"/products:",
		"/product-features:",
		"/plans:",
		"/applications/{application_id}/available-product-features:",
		"/applications/{application_id}/subscriptions:",
		"/applications/{application_id}/subscriptions/current:",
		"/owners/{owner_type}/{owner_id}/subscriptions:",
		"/subscriptions/{subscription_id}/plan-changes:",
		"/subscriptions/{subscription_id}/billing-events:",
		"/subscriptions/plan-changes/apply-due:",
		"/subscriptions/plan-changes/{plan_change_id}/payment-result:",
		"/applications/{application_id}/entitlements:",
		"/entitlements/check:",
		"x-permission: subscription.product.read",
		"x-permission: subscription.subscription.manage",
		"x-permission: subscription.entitlement.read",
		"security: []",
	} {
		if !strings.Contains(source, required) {
			t.Fatalf("subscription OpenAPI contract must include %q", required)
		}
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
	organisation, err := os.ReadFile("organisation.go")
	if err != nil {
		t.Fatal(err)
	}
	authorisation, err := os.ReadFile("authorisation.go")
	if err != nil {
		t.Fatal(err)
	}
	config, err := os.ReadFile("../config/config.go")
	if err != nil {
		t.Fatal(err)
	}
	scheduler, err := os.ReadFile("scheduler.go")
	if err != nil {
		t.Fatal(err)
	}
	command, err := os.ReadFile("../../../../cmd/services/subscriptions/api/main.go")
	if err != nil {
		t.Fatal(err)
	}

	schemaSource := string(schema)
	repositorySource := string(repository)
	apiSource := string(api)
	serverSource := string(server)
	organisationSource := string(organisation)
	authorisationSource := string(authorisation)
	configSource := string(config)
	schedulerSource := string(scheduler)
	commandSource := string(command)

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
		"GET /v1/owner-policies",
		"GET /v1/owner-policies/{owner_type}",
		"PUT /v1/owner-policies/{owner_type}",
		"listOwnerPolicies",
		"updateOwnerPolicy",
	} {
		if !strings.Contains(schemaSource+serverSource+repositorySource, required) {
			t.Fatalf("subscription schema must include productPatch owner policy contract fragment %q", required)
		}
	}

	for _, required := range []string{
		"application_id text NOT NULL DEFAULT ''",
		"organisation_id text NOT NULL DEFAULT ''",
		"CREATE INDEX IF NOT EXISTS subscriptions_subscriptions_application_idx",
		"CREATE INDEX IF NOT EXISTS subscriptions_subscriptions_organisation_idx",
		"ApplicationID  string",
		"OrganisationID string",
		"COALESCE(application_id, '')",
		"COALESCE(organisation_id, '')",
		"getApplication",
		"/v1/applications/%s",
		"application.OrganisationID",
		"organisationID != application.OrganisationID",
	} {
		if !strings.Contains(schemaSource+repositorySource+apiSource+organisationSource, required) {
			t.Fatalf("subscription lifecycle storage must include application/organisation contract fragment %q", required)
		}
	}

	for _, required := range []string{
		"status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'active', 'past_due', 'scheduled_downgrade', 'cancel_at_period_end', 'suspended')",
		"return Subscription{}, errConflict",
	} {
		if !strings.Contains(repositorySource, required) {
			t.Fatalf("subscription lifecycle repository must reject duplicate active subscriptions with fragment %q", required)
		}
	}

	for _, required := range []string{
		"CREATE TABLE IF NOT EXISTS subscriptions.subscription_audit_events",
		"subscriptions_audit_events_subscription_idx",
		"subscriptions_audit_events_owner_idx",
		"previous_status text NOT NULL DEFAULT ''",
		"new_status text NOT NULL DEFAULT ''",
		"previous_plan_id text NOT NULL DEFAULT ''",
		"new_plan_id text NOT NULL DEFAULT ''",
		"createSubscriptionAuditEvent",
		"subscription_created",
		"subscription_status_updated",
		"subscription_cancel_scheduled",
		"subscription_reactivated",
		"subscription_deleted",
		"plan_change_applied",
		"scheduled_downgrade_applied",
	} {
		if !strings.Contains(schemaSource+repositorySource, required) {
			t.Fatalf("subscription lifecycle audit must include fragment %q", required)
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
		"setFeatureStatus(ctx, id, \"RETIRED\")",
		"UPDATE product_features SET status = 'RETIRED'",
		"UPDATE products SET status = 'RETIRED'",
		"status = 'ACTIVE'",
		"is_selectable = true",
	} {
		if !strings.Contains(repositorySource, required) {
			t.Fatalf("feature lifecycle must preserve historical plan references and filter inactive features with fragment %q", required)
		}
	}
	if strings.Contains(repositorySource, "DELETE FROM plan_features WHERE feature_id") {
		t.Fatal("feature deletion must not delete historical plan feature references")
	}
	if strings.Contains(repositorySource, "DELETE FROM plan_products\n\t\tWHERE product_id") || strings.Contains(repositorySource, "DELETE FROM product_features WHERE product_id") {
		t.Fatal("product deletion must retire product data without deleting historical plan references")
	}

	for _, required := range []string{
		"FROM plan_features pf",
		"JOIN product_features f ON f.id = pf.feature_id",
		"JOIN products p ON p.id = f.product_id",
		"pf.limit_value",
		"AND f.status = 'ACTIVE'",
		"AND f.is_selectable = true",
		"AND p.status = 'ACTIVE'",
		"AND p.is_selectable = true",
		"FeatureIDs         []string",
		"raw[\"features\"]",
		"raw[\"included_feature_ids\"]",
		"raw[\"feature_ids\"]",
		"s.repo.replacePlanFeatures(r.Context(), result.ID",
	} {
		if !strings.Contains(repositorySource+apiSource, required) {
			t.Fatalf("plan feature allowlists must be explicit and active-only with fragment %q", required)
		}
	}

	if strings.Contains(repositorySource, "FROM plan_products pp\n\t\tJOIN products p ON p.id = pp.product_id\n\t\tJOIN product_features f ON f.product_id = p.id") {
		t.Fatal("plan features must not be inferred from plan_products")
	}

	for _, required := range []string{
		"CREATE TABLE IF NOT EXISTS subscriptions.subscription_plan_audit_events",
		"subscriptions_plan_audit_events_plan_idx",
		"createPlanAuditEvent",
		"plan_created",
		"plan_updated",
		"plan_features_replaced",
		"feature_ids",
	} {
		if !strings.Contains(schemaSource+repositorySource, required) {
			t.Fatalf("plan audit trail must include fragment %q", required)
		}
	}

	for _, required := range []string{
		"organisationClient",
		"/v1/applications/%s/services?limit=100",
		"organisation_service",
		"bootstrap_fallback",
		"candidate_data",
		"enabledServices",
		"enabledProductIDs",
		"product.ServiceID",
		"feature.ProductID",
		"ORGANISATION_PUBLIC_BASE_URL",
		"AUTHORISATION_PUBLIC_BASE_URL",
		"authorisationClient",
		"/v1/permissions?limit=100",
		"bootstrapCandidatesFromPermissions",
		"bootstrap_candidates",
		"Candidate:   true",
	} {
		if !strings.Contains(apiSource+serverSource+repositorySource+schemaSource+organisationSource+authorisationSource+configSource, required) {
			t.Fatalf("available product-feature loading must include Organisation Service filtering/fallback fragment %q", required)
		}
	}

	for _, required := range []string{
		"owner_type",
		"feature_key",
		"subscription_controlled",
		"SUBSCRIPTION_REQUIRED",
		"PLAN_FEATURE_NOT_INCLUDED",
		"if errors.Is(err, errNotFound) {\n\t\t\tresponse.Allowed = false\n\t\t\tresponse.Decision = \"DENY\"\n\t\t\tresponse.Reason = \"PLAN_FEATURE_NOT_INCLUDED\"",
		"SubjectID      string `json:\"subject_id\"`",
		"Permission     string `json:\"permission\"`",
		"Route          string `json:\"route\"`",
		"HTTPMethod     string `json:\"http_method\"`",
		"auditEntitlementDenial",
		"subscription_check_denied",
		"subscription_decision",
		"final_decision",
	} {
		if !strings.Contains(apiSource, required) && !strings.Contains(repositorySource, required) && !strings.Contains(serverSource, required) {
			t.Fatalf("entitlement decision surface must include %q for API gateway enforcement", required)
		}
	}

	for _, required := range []string{
		"GET /v1/applications/{application_id}/subscriptions/current",
		"GET /v1/owners/{owner_type}/{owner_id}/subscriptions",
		"POST /v1/owners/{owner_type}/{owner_id}/subscriptions",
		"GET /v1/owners/{owner_type}/{owner_id}/subscriptions/current",
		"GET /v1/owners/{owner_type}/{owner_id}/entitlements",
		"POST /v1/subscriptions/{subscription_id}/reactivate",
		"POST /v1/subscriptions/plan-changes/apply-due",
		"POST /v1/subscriptions/plan-changes/{plan_change_id}/payment-result",
	} {
		if !strings.Contains(serverSource, required) {
			t.Fatalf("server must register subscription route %q", required)
		}
	}

	for _, required := range []string{
		"listSubscriptionsByOwner",
		"entitlementsByOwner",
		"cancelSubscriptionAtPeriodEnd",
		"reactivateSubscription",
		"applyDueScheduledDowngrades",
		"applyScheduledDowngrade",
		"recordPlanChangePaymentResult",
	} {
		if !strings.Contains(repositorySource, required) {
			t.Fatalf("repository must expose owner-scoped subscription helper %q", required)
		}
	}

	for _, required := range []string{
		"currentApplicationSubscription",
		"currentSubscriptionForOwner",
		"currentSubscriptionResponse",
		"\"pending_change\"",
		"\"billing_events\"",
		"\"cancellation\"",
		"requested\", \"checkout_pending\", \"payment_confirmed\", \"scheduled",
		"listBillingEvents(ctx, item.ID",
	} {
		if !strings.Contains(apiSource, required) {
			t.Fatalf("current subscription response must include pending change, billing, and cancellation state with fragment %q", required)
		}
	}

	if !strings.Contains(repositorySource, "AND (status != 'cancel_at_period_end' OR cancel_at IS NULL OR cancel_at > now())") {
		t.Fatal("entitlement queries must stop granting cancelled-at-period-end subscriptions after cancel_at has passed")
	}

	for _, required := range []string{
		"status = 'scheduled'",
		"status = 'applied'",
		"scheduled_downgrade_applied",
		"FOR UPDATE",
		"payment_confirmed",
		"payment_failed",
	} {
		if !strings.Contains(repositorySource, required) {
			t.Fatalf("repository must implement idempotent scheduled downgrade application fragment %q", required)
		}
	}

	for _, required := range []string{
		"DowngradeSchedulerInterval",
		"SUBSCRIPTION_DOWNGRADE_SCHEDULER_INTERVAL",
		"startSchedulers",
		"runDowngradeScheduler",
		"applyDueScheduledDowngrades(ctx, time.Now().UTC(), 100)",
		"NewWithCleanup",
	} {
		if !strings.Contains(configSource+schedulerSource+apiSource+commandSource, required) {
			t.Fatalf("scheduled downgrade worker must include fragment %q", required)
		}
	}

	for _, required := range []string{
		"checkoutRequired := plan.PriceMinor > 0 && stripeBillableCycle(plan.BillingCycle)",
		"if checkoutRequired && activatesSubscription(item.Status)",
		"\"checkout_required\": checkoutRequired",
		"planPriceMinor > 0 && stripeBillableCycle(planBillingCycle) && activatesSubscription(item.Status)",
		"item.Status = \"checkout_pending\"",
	} {
		if !strings.Contains(apiSource+repositorySource, required) {
			t.Fatalf("paid subscription creation must stay checkout_pending before payment success with fragment %q", required)
		}
	}
}
