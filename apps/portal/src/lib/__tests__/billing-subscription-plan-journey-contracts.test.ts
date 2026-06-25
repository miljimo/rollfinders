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
    const prd = readSource("docs/services/subscriptions/billing-subscription-plan-journey.md");
    const subscriptionsServer = readSource("apps/backend_api/internal/services/subscriptions/server/server.go");

    assert.match(prd, /POST \/v1\/subscriptions\/\{subscriptionId\}\/plan-changes/);
    assert.match(prd, /GET \/v1\/subscriptions\/\{subscriptionId\}\/plan-changes/);
    assert.match(prd, /subscription_billing_events/);

    assert.match(subscriptionsServer, /POST \/v1\/subscriptions\/\{subscription_id\}\/plan-changes/);
    assert.match(subscriptionsServer, /GET \/v1\/subscriptions\/\{subscription_id\}\/plan-changes/);
    assert.match(subscriptionsServer, /GET \/v1\/subscriptions\/\{subscription_id\}\/billing-events/);
  });

  it("persists plan-change requests and billing audit events for the first PRD slice", () => {
    const prd = readSource("docs/services/subscriptions/billing-subscription-plan-journey.md");
    const schema = readSource("apps/backend_api/migrations/subscriptions/001_core_schema.sql");
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
});
