# 004 - Create Subscription Database Schema

## Feature / Component

- Feature: Subscription Service
- Component: Database schema and migrations
- Priority: P0
- Branch: `feature/subscription-core-schema`
- Developer owner: DB sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket003BootstrapSubscriptionGoApiService
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Task

Create the Subscription Service database schema for product catalogue, feature catalogue, plans, subscriptions, plan changes, and entitlement evaluation.

## Implementation Notes

- Add migrations under `apps/backend_api/internal/services/subscriptions/migrations`.
- Use a dedicated `subscriptions` schema.
- Add tables for:
  - products;
  - product_features;
  - plans;
  - plan_features;
  - organisation_subscriptions;
  - subscription_plan_changes;
  - entitlement_snapshots or equivalent entitlement read model;
  - subscription_audit_events.
- Store `organisation_id` and `application_id` as external text identifiers.
- Add status columns for products, features, plans, and subscriptions.
- Add service key on products so available service loading can filter products.
- Add optional limit metadata on product features and plan features.
- Add unique keys for product keys, feature keys, plan keys, and plan-feature pairs.
- Do not create foreign keys to Organisation, Authorisation, Payments, Academy, Booking, or Courses service tables.

## Acceptance Criteria

- WHEN migrations run repeatedly, THEN they are idempotent or safe under the repo's migration framework.
- WHEN schema is inspected, THEN all Subscription Service tables live under the `subscriptions` schema.
- WHEN plan features are stored, THEN unknown duplicate plan-feature rows are prevented by constraints.
- WHEN external service identifiers are stored, THEN no cross-service database foreign keys exist.

## Regression / Compatibility Tests

- Add static schema tests that verify table names, schema ownership, and absence of cross-service foreign keys.
- Add migration smoke tests where the existing migration framework supports them.

## Out Of Scope

API handlers and business behavior.
