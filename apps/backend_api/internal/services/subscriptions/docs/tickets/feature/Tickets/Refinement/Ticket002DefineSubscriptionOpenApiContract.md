# 002 - Define Subscription OpenAPI Contract

## Feature / Component

- Feature: Subscription Service
- Component: API contract
- Priority: P0
- Branch: `feature/subscription-openapi-contract`
- Developer owner: Developer sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket001FinaliseSubscriptionDomainBoundaries
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Task

Create the Subscription Service API contract before implementing handlers.

## Implementation Notes

- Add `apps/backend_api/internal/services/subscriptions/docs/api/openApi.yaml`.
- Define health and readiness endpoints.
- Define product catalogue endpoints:
  - `GET /v1/products`
  - `POST /v1/products`
  - `GET /v1/products/{product_key}`
  - `PUT /v1/products/{product_key}`
- Define product feature endpoints:
  - `GET /v1/product-features`
  - `POST /v1/product-features`
  - `GET /v1/product-features/{feature_key}`
  - `PUT /v1/product-features/{feature_key}`
- Define plan endpoints:
  - `GET /v1/plans`
  - `POST /v1/plans`
  - `GET /v1/plans/{plan_key}`
  - `PUT /v1/plans/{plan_key}`
  - `PUT /v1/plans/{plan_key}/features`
- Define plan-builder endpoint:
  - `GET /v1/applications/{application_id}/available-product-features`
- Define subscription lifecycle endpoints:
  - `GET /v1/applications/{application_id}/subscriptions`
  - `POST /v1/applications/{application_id}/subscriptions`
  - `GET /v1/subscriptions/{subscription_id}`
  - `POST /v1/subscriptions/{subscription_id}/cancel`
  - `POST /v1/subscriptions/{subscription_id}/change-plan`
- Define entitlement endpoint:
  - `GET /v1/applications/{application_id}/entitlements`
- Treat application-scoped routes as the canonical write/read shape because subscriptions are scoped to an organisation application.
- Include `organisation_id` in application-scoped responses so callers can still see the tenant owner.
- Add `GET /v1/organisations/{organisation_id}/subscriptions` later only as an aggregate/read-only convenience endpoint if product requirements need cross-application subscription views.
- Use stable JSON error envelopes consistent with existing Go services.
- Mark only `GET /healthz` and `GET /readyz` as public.
- Mark every product, product-feature, plan, plan-builder, subscription, and entitlement endpoint as protected.
- Define the required Authorisation permission for every protected route:
  - product reads: `subscription.product.read`
  - product writes: `subscription.product.manage`
  - plan reads: `subscription.plan.read`
  - plan writes: `subscription.plan.manage`
  - available feature reads: `subscription.available_features.read`
  - subscription reads: `subscription.subscription.read`
  - subscription writes: `subscription.subscription.manage`
  - entitlement reads: `subscription.entitlement.read`
- Document that browser/mobile traffic reaches these routes through the API gateway, which calls Authorisation Service before proxying.

## Endpoint Requirements

### `GET /healthz`

- Public: yes.
- Permission: none.
- Logic: return process health only.
- Response: JSON health payload consistent with existing Go services.
- Failure: should not require database connectivity.

### `GET /readyz`

- Public: yes.
- Permission: none.
- Logic: verify the service can reach required dependencies, especially its database.
- Response: JSON readiness payload consistent with existing Go services.
- Failure: return non-ready status when required dependencies are unavailable.

### `GET /v1/products`

- Public: no.
- Permission: `subscription.product.read`.
- Scope: application when supplied by gateway context.
- Logic: list products from the Subscription Service catalogue.
- Filters: status, service key, plan-selectable flag, search text.
- Response: products include `key`, `service_key`, `name`, `description`, `status`, `plan_selectable`, timestamps.
- Failure: invalid filters return validation error.

### `POST /v1/products`

- Public: no.
- Permission: `subscription.product.manage`.
- Scope: platform/application.
- Logic: create a product that maps a commercial capability area to a service key.
- Required input: `key`, `service_key`, `name`, `status`, `plan_selectable`.
- Validation: key is stable and unique; service key is non-empty; status is allowed; product key cannot collide with existing product.
- Response: created product.
- Failure: duplicate key, invalid status, or invalid service key returns validation/conflict error.

### `GET /v1/products/{product_key}`

- Public: no.
- Permission: `subscription.product.read`.
- Scope: application when supplied by gateway context.
- Logic: fetch one product and optionally include its active product features.
- Validation: product key is required.
- Response: product detail.
- Failure: unknown product returns not found.

### `PUT /v1/products/{product_key}`

- Public: no.
- Permission: `subscription.product.manage`.
- Scope: platform/application.
- Logic: update mutable product metadata.
- Mutable fields: `name`, `description`, `status`, `plan_selectable`.
- Validation: product key is immutable; service key changes require an explicit migration decision and should not be part of the default update contract.
- Response: updated product.
- Failure: unknown product, invalid status, or invalid transition returns error.

### `GET /v1/product-features`

- Public: no.
- Permission: `subscription.product.read`.
- Scope: application when supplied by gateway context.
- Logic: list product features from the catalogue.
- Filters: product key, status, plan-selectable flag, service key, search text.
- Response: features include `key`, `product_key`, `name`, `description`, `status`, `plan_selectable`, optional limit metadata.
- Failure: invalid filters return validation error.

### `POST /v1/product-features`

- Public: no.
- Permission: `subscription.product.manage`.
- Scope: platform/application.
- Logic: create a commercial product feature under an active product.
- Required input: `key`, `product_key`, `name`, `status`, `plan_selectable`.
- Validation: feature key is stable and unique; product exists; product is active; feature key is not treated as an Authorisation permission record.
- Response: created product feature.
- Failure: duplicate key, unknown product, inactive product, or invalid status returns error.

### `GET /v1/product-features/{feature_key}`

- Public: no.
- Permission: `subscription.product.read`.
- Scope: application when supplied by gateway context.
- Logic: fetch one product feature and its product metadata.
- Validation: feature key is required.
- Response: feature detail.
- Failure: unknown feature returns not found.

### `PUT /v1/product-features/{feature_key}`

- Public: no.
- Permission: `subscription.product.manage`.
- Scope: platform/application.
- Logic: update mutable product feature metadata.
- Mutable fields: `name`, `description`, `status`, `plan_selectable`, limit metadata.
- Validation: feature key is immutable; product key changes require explicit migration and should not be part of the default update contract.
- Response: updated product feature.
- Failure: unknown feature, invalid status, or invalid limit metadata returns error.

### `GET /v1/plans`

- Public: no.
- Permission: `subscription.plan.read`.
- Scope: application when supplied by gateway context.
- Logic: list commercial plans.
- Filters: status, billing cycle, currency, search text.
- Response: plans include `key`, `name`, `description`, `status`, pricing metadata, billing cycle, and optionally feature count.
- Failure: invalid filters return validation error.

### `POST /v1/plans`

- Public: no.
- Permission: `subscription.plan.manage`.
- Scope: platform/application.
- Logic: create a plan without implicitly granting product features.
- Required input: `key`, `name`, `status`, billing/pricing metadata.
- Validation: plan key is stable and unique; status is allowed; pricing metadata is valid; no features are granted unless supplied through the plan feature allowlist contract.
- Response: created plan.
- Failure: duplicate key, invalid status, or invalid pricing metadata returns error.

### `GET /v1/plans/{plan_key}`

- Public: no.
- Permission: `subscription.plan.read`.
- Scope: application when supplied by gateway context.
- Logic: fetch one plan with its explicit feature allowlist.
- Validation: plan key is required.
- Response: plan detail including included feature keys and limits.
- Failure: unknown plan returns not found.

### `PUT /v1/plans/{plan_key}`

- Public: no.
- Permission: `subscription.plan.manage`.
- Scope: platform/application.
- Logic: update mutable plan metadata without replacing the feature allowlist.
- Mutable fields: `name`, `description`, `status`, pricing metadata, billing cycle.
- Validation: plan key is immutable; active subscription impact must be documented before status changes that would affect active customers.
- Response: updated plan.
- Failure: unknown plan, invalid status, invalid pricing metadata, or unsafe transition returns error.

### `PUT /v1/plans/{plan_key}/features`

- Public: no.
- Permission: `subscription.plan.manage`.
- Scope: platform/application.
- Logic: replace the plan's explicit product feature allowlist.
- Required input: list of feature keys with optional limit values.
- Validation: plan exists; every feature exists; every feature is active and plan-selectable; disabled-service features are rejected when Organisation Service availability is active; duplicate feature keys are rejected.
- Response: updated plan with full feature allowlist.
- Failure: unknown plan, unknown feature, inactive feature, disabled-service feature, duplicate feature, or invalid limit metadata returns error.

### `GET /v1/applications/{application_id}/available-product-features`

- Public: no.
- Permission: `subscription.available_features.read`.
- Scope: application.
- Logic: return product features available for plan creation for the application.
- Primary source: Organisation Service application-service enablement.
- Bootstrap fallback: when Organisation Service service availability is unavailable, load Authorisation permission definitions as draft product-feature candidates.
- Response: available products/features and metadata showing whether data came from Organisation Service or bootstrap fallback.
- Failure: invalid application id returns validation error; dependency failures should return a clear unavailable response unless bootstrap fallback applies.

### `GET /v1/applications/{application_id}/subscriptions`

- Public: no.
- Permission: `subscription.subscription.read`.
- Scope: organisation/application.
- Logic: list subscriptions for one application.
- Validation: application id is required; service resolves or includes owning organisation id.
- Response: subscriptions include `subscription_id`, `organisation_id`, `application_id`, `plan_key`, status, billing period, trial period, pending change summary.
- Failure: unknown application or unavailable Organisation Service validation returns error according to dependency policy.

### `POST /v1/applications/{application_id}/subscriptions`

- Public: no.
- Permission: `subscription.subscription.manage`.
- Scope: organisation/application.
- Logic: create a subscription for an organisation application.
- Required input: `plan_key`, initial status or trial configuration, billing period metadata.
- Validation: application exists; owning organisation is resolved; plan exists and is active; duplicate active subscription for the same application is rejected.
- Response: created subscription.
- Failure: unknown application, unknown plan, inactive plan, duplicate active subscription, or invalid billing/trial metadata returns error.

### `GET /v1/subscriptions/{subscription_id}`

- Public: no.
- Permission: `subscription.subscription.read`.
- Scope: organisation/application resolved from subscription.
- Logic: fetch one subscription by id.
- Validation: subscription id is required.
- Response: subscription detail including current plan, status, billing/trial windows, pending changes, and active entitlement summary.
- Failure: unknown subscription returns not found.

### `POST /v1/subscriptions/{subscription_id}/cancel`

- Public: no.
- Permission: `subscription.subscription.manage`.
- Scope: organisation/application resolved from subscription.
- Logic: cancel a subscription immediately or at period end according to request policy.
- Required input: cancellation mode and reason.
- Validation: subscription exists; subscription is cancellable; immediate cancellation is allowed only for explicit admin/manual policy.
- Response: updated subscription with cancellation state.
- Failure: unknown subscription, already cancelled subscription, or invalid cancellation mode returns error.

### `POST /v1/subscriptions/{subscription_id}/change-plan`

- Public: no.
- Permission: `subscription.subscription.manage`.
- Scope: organisation/application resolved from subscription.
- Logic: request an upgrade or downgrade.
- Required input: target `plan_key`, effective timing, optional payment/proration metadata.
- Validation: subscription exists; target plan exists and is active; upgrade/downgrade rules are followed; payment handoff is required when policy says so.
- Response: activated plan change for successful immediate changes or pending plan change for future downgrades.
- Failure: unknown subscription, inactive target plan, failed payment handoff, or invalid transition returns error.

### `GET /v1/applications/{application_id}/entitlements`

- Public: no.
- Permission: `subscription.entitlement.read`.
- Scope: organisation/application.
- Logic: return active commercial feature grants for the application.
- Validation: application id is required; active subscription is resolved for the application.
- Response: `organisation_id`, `application_id`, `subscription_id`, `plan_key`, subscription status, and active features with product keys and limits.
- Failure: no active subscription returns an empty active feature list or a documented no-active-subscription state; missing features are never returned as granted.

## Acceptance Criteria

- WHEN the OpenAPI file is reviewed, THEN every endpoint needed by the PRD has a request and response schema.
- WHEN a plan response is returned, THEN it includes explicit feature allowlist data.
- WHEN entitlements are returned, THEN missing features are not represented as granted.
- WHEN available features are returned, THEN bootstrap fallback state is visible in response metadata.
- WHEN any protected route is documented, THEN the contract identifies the required permission.
- WHEN health or readiness is documented, THEN those are the only public routes.

## Regression / Compatibility Tests

- Add or plan a static contract test that validates the OpenAPI file exists and includes required routes.
- Confirm routes do not expose permission assignment writes.
- Add or plan a route-permission contract test proving every non-health route has a required subscription permission.

## Out Of Scope

Handler implementation.
