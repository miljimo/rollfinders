import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("Usage Limits Service PRD boundary contracts", () => {
  it("keeps Usage Limits separate from subscriptions, authorisation, and pricing", () => {
    const usage = readSource("docs/services/usage_limits/product.md");
    const subscriptions = readSource("docs/services/subscriptions/product.md");
    const authorisation = readSource("docs/services/authorisation/product.md");
    const pricing = readSource("docs/services/pricing/proposal.md");

    assert.match(usage, /Usage Limits Service owns:[\s\S]*Generic usage limit rules[\s\S]*Usage reservations[\s\S]*Usage decision audit events/);
    assert.match(usage, /Subscription Service owns commercial plan definitions, owner subscriptions, and entitlements/);
    assert.match(usage, /Usage limit decisions SHALL NOT be modelled as permissions/);
    assert.match(usage, /Pricing Policy Service owns commercial fee rules/);

    assert.match(subscriptions, /Usage limit counters/);
    assert.match(subscriptions, /Usage quota enforcement/);
    assert.match(authorisation, /Usage Limits Service Owns[\s\S]*quota decisions and usage audit events/);
    assert.match(pricing, /Usage Limits Service owns quota rules, counters, reservations, overrides, and usage audit events/);
  });

  it("does not introduce a second plan system for usage limits", () => {
    const usage = readSource("docs/services/usage_limits/product.md");

    assert.match(usage, /subscription_plan_id text NOT NULL/);
    assert.match(usage, /opaque Subscription Service plan identifier/);
    assert.doesNotMatch(usage, /CREATE TABLE usage_plans/);
    assert.doesNotMatch(usage, /CREATE TABLE owner_usage_plans/);
    assert.doesNotMatch(usage, /owner_usage_plans \(/);
  });

  it("documents gateway reservation enforcement and v1 quota semantics", () => {
    const usage = readSource("docs/services/usage_limits/product.md");
    const subscriptions = readSource("docs/services/subscriptions/product.md");

    assert.match(usage, /Authorisation Service:[\s\S]*Subscription Service:[\s\S]*Usage Limits Service:[\s\S]*Domain Service:/);
    assert.match(usage, /If Usage Limits Service is unavailable for a limited route, the gateway must fail closed/);
    assert.match(usage, /V1 resource limits are active-count limits/);
    assert.match(usage, /Missing matching rule means unlimited/);
    assert.match(usage, /Monthly-style limits must use the owner subscription billing period/);
    assert.match(usage, /POST \/v1\/usage-limits\/reservations/);
    assert.match(usage, /POST \/v1\/usage-limits\/reservations\/\{reservation_id\}\/confirm/);
    assert.match(usage, /POST \/v1\/usage-limits\/reservations\/\{reservation_id\}\/release/);

    assert.match(subscriptions, /billing_period_start/);
    assert.match(subscriptions, /billing_period_end/);
    assert.match(subscriptions, /Usage Limits Service when the route has usage-limit metadata/);
  });
});
