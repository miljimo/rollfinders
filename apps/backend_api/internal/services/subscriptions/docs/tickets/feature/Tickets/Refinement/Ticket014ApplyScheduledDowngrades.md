# 014 - Apply Scheduled Downgrades

## Feature / Component

- Feature: Subscription Service
- Component: Backend worker and entitlement recalculation
- Priority: P1
- Branch: `feature/subscription-downgrade-scheduler`
- Developer owner: Developer sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket011IntegratePaymentsAndPlanChanges
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Goal

Apply due scheduled downgrades at their effective date without removing current entitlements early.

## Scope

The agent must:
- Add a worker or service operation that finds `scheduled` downgrade plan changes whose `effective_at` is due.
- Apply the target plan to the subscription and mark the plan change `applied`.
- Recalculate or expose entitlements from the new active plan after application.
- Record a lifecycle or billing event for the applied downgrade.

The agent must not:
- Apply downgrades before `effective_at`.
- Implement automatic refunds or proration ledgers.

## Implementation Notes

- Use Subscription Service-owned tables only.
- Preserve Payment Service ownership of billing collection and refunds.
- Scheduled downgrade logic must be idempotent.

## Acceptance Criteria

- WHEN a scheduled downgrade is not due, THEN the active plan and entitlements remain unchanged.
- WHEN a scheduled downgrade is due, THEN the subscription moves to the target plan and removed features become unavailable.
- WHEN the worker runs twice, THEN the downgrade is not applied twice.

## Regression / Compatibility Tests

- Confirm active entitlements remain unchanged before the effective date.
- Confirm cancelled or failed plan changes are ignored.
- Confirm no Payment Service tables are written.

## Out Of Scope

- Immediate downgrade policy.
- Refund automation.
