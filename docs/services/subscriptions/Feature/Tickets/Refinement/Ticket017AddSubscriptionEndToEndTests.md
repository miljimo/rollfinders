# 017 - Add Subscription End-To-End Tests

## Feature / Component

- Feature: Subscription Service
- Component: QA / Backend / Frontend
- Priority: P1
- Branch: `feature/subscription-e2e-tests`
- Developer owner: Tester sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket016ImplementPortalPlanJourneyUI
- Source PRD: `docs/services/subscriptions/product.md`

## Goal

Prove the subscription journey and final access decision model work end to end.

## Scope

The agent must:
- Test free plan subscription.
- Test paid plan subscription through mocked checkout.
- Test upgrade, scheduled downgrade, cancellation, and reactivation.
- Test denial when IAM allows but the owner plan lacks the feature.
- Test a user operating under two academy contexts where only one academy is subscribed.

The agent must not:
- Depend on live payment providers.
- Require production credentials.

## Implementation Notes

- Prefer mocked Payment Service checkout and callbacks.
- Assert that subscription denial happens before downstream business service calls.
- Keep tests deterministic and runnable in local CI.

## Acceptance Criteria

- WHEN the E2E suite runs, THEN each final decision matrix row has coverage.
- WHEN an owner lacks an active plan, THEN subscription-controlled feature access is denied.
- WHEN another owner has the plan, THEN access does not leak across owner contexts.

## Regression / Compatibility Tests

- Confirm IAM-only routes still work.
- Confirm public/free/basic features remain accessible where policy allows.
- Confirm existing gateway permission checks still execute.

## Out Of Scope

- Load testing.
- Live Stripe checkout.
