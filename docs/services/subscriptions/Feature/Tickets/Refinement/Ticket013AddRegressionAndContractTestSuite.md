# 013 - Add Regression And Contract Test Suite

## Feature / Component

- Feature: Subscription Service
- Component: Regression and contract testing
- Priority: P1
- Branch: `feature/subscription-regression-suite`
- Developer owner: Tester sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket012AddRollFindersClientAndGatewayIntegration
- Source PRD: `docs/services/subscriptions/product.md`

## Task

Add a focused regression suite for Subscription Service ownership, catalogue loading, plan rules, subscriptions, entitlements, and integration contracts.

## Implementation Notes

- Add static tests that Subscription Service does not write Authorisation, Payments, Organisation, Academy, Booking, Courses, or Users schemas.
- Add OpenAPI route coverage tests.
- Add gateway route-permission coverage tests for every Subscription Service business route.
- Add product/feature catalogue validation tests.
- Add available-service loading tests for Organisation Service success, disabled services, and bootstrap fallback.
- Add plan allowlist tests for missing, unknown, inactive, duplicate, and disabled-service features.
- Add subscription lifecycle tests for active, trial, cancelled, expired, pending downgrade, and upgrade failure states.
- Add entitlement response contract tests.
- Add Payments Service handoff contract tests.
- Add gateway/client integration tests where implemented.

## Acceptance Criteria

- WHEN the full regression suite runs, THEN Subscription Service boundaries are enforced by tests.
- WHEN Organisation Service is unavailable during bootstrap, THEN tests prove fallback only creates candidates and does not grant customer entitlements.
- WHEN a plan omits a feature, THEN tests prove the feature is unavailable.
- WHEN Authorisation permissions change names, THEN Subscription product feature keys are not required to change.
- WHEN Payments Service integration is tested, THEN feature internals are not sent to Payments Service.
- WHEN a Subscription Service route is not health/readiness, THEN tests prove it is protected by an Authorisation permission.

## Regression / Compatibility Tests

- This ticket is the regression suite. Keep tests near the code they protect, following existing repo conventions.

## Out Of Scope

New product requirements not already covered by `docs/services/subscriptions/product.md`.
