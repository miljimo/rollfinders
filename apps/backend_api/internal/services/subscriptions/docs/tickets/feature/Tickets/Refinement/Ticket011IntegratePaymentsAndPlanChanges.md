# 011 - Integrate Payments And Plan Changes

## Feature / Component

- Feature: Subscription Service
- Component: Upgrade, downgrade, and payment handoff
- Priority: P1
- Branch: `feature/subscription-plan-change-payments`
- Developer owner: Developer sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket010ImplementEntitlementEvaluationApis
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Task

Implement plan-change workflows and Payments Service handoff.

## Implementation Notes

- Implement `POST /v1/subscriptions/{subscription_id}/change-plan`.
- Support immediate upgrades after successful payment handoff.
- Support downgrades as pending changes effective next billing cycle by default.
- Calculate proration inputs in Subscription Service.
- Send charge requests to Payments Service without telling Payments Service what features are included.
- Activate upgraded plans only after successful payment response unless a free/manual admin policy applies.
- Do not issue partial refunds automatically for downgrades.
- Publish or update entitlement state after plan change activation.
- Add audit events for requested, paid, activated, failed, and cancelled plan changes.

## Acceptance Criteria

- WHEN an upgrade payment succeeds, THEN the new plan becomes active and entitlements update.
- WHEN an upgrade payment fails, THEN the current plan remains active.
- WHEN a downgrade is requested, THEN it is stored as pending and current entitlements remain until the effective date.
- WHEN the downgrade effective date arrives, THEN the reduced plan entitlements are published.
- WHEN Payments Service is called, THEN the request contains charge/proration data, not product feature internals.

## Regression / Compatibility Tests

- Add tests for successful upgrade, failed upgrade, pending downgrade, and downgrade activation.
- Add tests that downgrade does not remove features early.
- Add contract tests for Payments Service client request shape.

## Out Of Scope

Full invoice history and provider-specific payment behavior.
