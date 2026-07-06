# 010 - Implement Entitlement Evaluation APIs

## Feature / Component

- Feature: Subscription Service
- Component: Entitlement evaluation and publication
- Priority: P1
- Branch: `feature/subscription-entitlement-apis`
- Developer owner: Developer sub-agent and DB sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket009ImplementSubscriptionLifecycleApis
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Task

Implement active entitlement evaluation for organisations.

## Implementation Notes

- Implement `GET /v1/applications/{application_id}/entitlements`.
- Return owning organisation id, application id, active subscription id, plan key, subscription status, and active feature grants.
- Include `product_key` and limit metadata for each feature.
- Treat missing features as unavailable.
- Return no active feature grants for inactive, cancelled, expired, or outside-trial subscriptions.
- Use application id as the canonical entitlement scope.
- Add cache headers or internal caching only if consistent with current service patterns; correctness takes priority.

## Acceptance Criteria

- WHEN an application has an active subscription, THEN entitlement output includes only that plan's active feature allowlist.
- WHEN a feature is missing from the plan, THEN it is not returned.
- WHEN a subscription is expired, THEN no active feature grants are returned.
- WHEN a plan feature has limits, THEN limits are included in the entitlement response.
- WHEN a consumer checks a feature that is absent from the response, THEN the correct interpretation is unavailable.

## Regression / Compatibility Tests

- Add entitlement tests for active, trial, cancelled, expired, and pending downgrade states.
- Add tests that inactive product features are not newly published unless historical behavior is explicitly approved.
- Add JSON contract tests for the entitlement response shape.

## Out Of Scope

Gateway integration and payment-triggered plan changes.
