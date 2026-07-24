import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("billing subscription plan journey contracts", () => {
  it("documents and exposes the implemented plan-change and billing-event endpoints", () => {
    const prd = readSource("apps/backend_api/internal/services/subscriptions/docs/product.md");
    const subscriptionsServer = readSource("apps/backend_api/internal/services/subscriptions/server/server.go");

    assert.match(prd, /POST \/v1\/subscriptions\/\{subscription_id\}\/plan-changes/);
    assert.match(prd, /GET \/v1\/subscriptions\/\{subscription_id\}\/plan-changes/);
    assert.match(prd, /subscription_billing_events/);

    assert.match(subscriptionsServer, /POST \/v1\/subscriptions\/\{subscription_id\}\/plan-changes/);
    assert.match(subscriptionsServer, /GET \/v1\/subscriptions\/\{subscription_id\}\/plan-changes/);
    assert.match(subscriptionsServer, /GET \/v1\/subscriptions\/\{subscription_id\}\/billing-events/);
  });

  it("persists plan-change requests and billing audit events for the first PRD slice", () => {
    const prd = readSource("apps/backend_api/internal/services/subscriptions/docs/product.md");
    const schema = readSource("apps/backend_api/internal/services/subscriptions/migrations/001_core_schema.sql");
    const subscriptionRepo = readSource("apps/backend_api/internal/services/subscriptions/server/repository.go");
    const subscriptionApi = readSource("apps/backend_api/internal/services/subscriptions/server/api.go");

    assert.match(prd, /subscription_plan_changes/);
    assert.match(prd, /subscription_billing_events/);
    assert.match(schema, /CREATE TABLE IF NOT EXISTS subscriptions\.subscription_plan_changes/);
    assert.match(schema, /CREATE TABLE IF NOT EXISTS subscriptions\.subscription_billing_events/);
    assert.match(schema, /checkout_pending/);
    assert.match(schema, /payment_confirmed/);

    assert.match(subscriptionApi, /createPlanChange/);
    assert.match(subscriptionApi, /createBillingEvent/);
    assert.match(subscriptionRepo, /createPlanChange/);
    assert.match(subscriptionRepo, /listPlanChanges/);
    assert.match(subscriptionRepo, /createBillingEvent/);
    assert.match(subscriptionRepo, /listBillingEvents/);
    assert.match(subscriptionRepo, /checkout_id|payment_id/);
  });

  it("documents operator recovery for subscription plan changes and entitlement denials", () => {
    const runbook = readSource("apps/backend_api/internal/services/subscriptions/docs/runbooks/runbook.md");
    const prd = readSource("apps/backend_api/internal/services/subscriptions/docs/product.md");
    const subscriptionsServer = readSource("apps/backend_api/internal/services/subscriptions/server/server.go");

    assert.match(runbook, /POST \/v1\/subscriptions\/plan-changes\/apply-due/);
    assert.match(runbook, /POST \/v1\/subscriptions\/plan-changes\/\{plan_change_id\}\/payment-result/);
    assert.match(subscriptionsServer, /POST \/v1\/subscriptions\/plan-changes\/\{plan_change_id\}\/payment-result/);
    assert.match(runbook, /payment_failed/);
    assert.match(runbook, /plan_change_applied/);
    assert.match(runbook, /scheduled_downgrade_applied/);
    assert.match(runbook, /SUBSCRIPTION_DOWNGRADE_SCHEDULER_INTERVAL/);
    assert.match(runbook, /POST \/v1\/subscriptions\/\{subscription_id\}\/reactivate/);
    assert.match(runbook, /PLAN_FEATURE_NOT_INCLUDED/);
    assert.match(runbook, /SUBSCRIPTION_OWNER_MISMATCH/);
    assert.match(runbook, /Migration And Rollback Notes/);
    assert.match(runbook, /apps\/backend_api\/internal\/services\/subscriptions\/migrations/);
    assert.match(runbook, /never drop non-Subscription Service schemas/);
    assert.match(prd, /SUBSCRIPTION_OWNER_MISMATCH/);
  });

  it("wires cancellation and reactivation through the portal subscription journey", () => {
    const serviceClient = readSource("apps/portal/src/lib/subscriptions-service.ts");
    const actions = readSource("apps/portal/src/app/dashboard/subscriptions/actions.ts");
    const page = readSource("apps/portal/src/app/dashboard/subscriptions/page.tsx");

    assert.match(serviceClient, /cancelApplicationSubscription/);
    assert.match(serviceClient, /\/cancel/);
    assert.match(serviceClient, /reactivateApplicationSubscription/);
    assert.match(serviceClient, /\/reactivate/);
    assert.match(actions, /cancelSubscriberAction/);
    assert.match(actions, /reactivateSubscriberAction/);
    assert.match(page, /Cancel At Period End/);
    assert.match(page, /Reactivate Subscription/);
  });

  it("redirects paid subscription creation through checkout when required", () => {
    const serviceClient = readSource("apps/portal/src/lib/subscriptions-service.ts");
    const actions = readSource("apps/portal/src/app/dashboard/subscriptions/actions.ts");

    assert.match(serviceClient, /CreateSubscriptionResponse/);
    assert.match(serviceClient, /checkout_required\?: boolean/);
    assert.match(actions, /const subscriptions = await subscriptionsForSelectedPlans/);
    assert.match(actions, /if \(planIds\.length === 1 && subscription\?\.id\)/);
    assert.match(actions, /createSubscriptionCheckout\(subscription\.id/);
    assert.match(actions, /redirect\(checkoutUrl\)/);
  });

  it("surfaces subscription denial recovery actions in the portal", () => {
    const serviceClient = readSource("apps/portal/src/lib/subscriptions-service.ts");
    const actions = readSource("apps/portal/src/app/dashboard/subscriptions/actions.ts");
    const page = readSource("apps/portal/src/app/dashboard/subscriptions/page.tsx");

    assert.match(serviceClient, /readonly code = ""/);
    assert.match(actions, /actionErrorCode/);
    assert.match(page, /SUBSCRIPTION_REQUIRED/);
    assert.match(page, /PLAN_FEATURE_NOT_INCLUDED/);
    assert.match(page, /View Plans/);
    assert.match(page, /Start Free Plan/);
    assert.match(page, /Upgrade/);
    assert.match(page, /Contact Support/);
  });

  it("renders subscription billing events in the portal dashboard", () => {
    const serviceClient = readSource("apps/portal/src/lib/subscriptions-service.ts");
    const page = readSource("apps/portal/src/app/dashboard/subscriptions/page.tsx");

    assert.match(serviceClient, /SubscriptionBillingEvent/);
    assert.match(serviceClient, /listSubscriptionBillingEvents/);
    assert.match(serviceClient, /\/billing-events\?limit=100/);
    assert.match(page, /BillingEventsTable/);
    assert.match(page, /listSubscriptionBillingEvents\(subscription\.id/);
    assert.doesNotMatch(page, /Billing event ingestion is not connected yet/);
  });

  it("loads current subscription state for pending plan and cancellation notices", () => {
    const serviceClient = readSource("apps/portal/src/lib/subscriptions-service.ts");
    const page = readSource("apps/portal/src/app/dashboard/subscriptions/page.tsx");

    assert.match(serviceClient, /CurrentSubscriptionState/);
    assert.match(serviceClient, /getCurrentApplicationSubscription/);
    assert.match(serviceClient, /\/subscriptions\/current/);
    assert.match(page, /getCurrentApplicationSubscription\(applicationId/);
    assert.match(page, /CurrentSubscriptionNotice/);
    assert.match(page, /pending_change/);
    assert.match(page, /cancellation/);
  });
});
