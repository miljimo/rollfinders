# 015 - Implement Cancellation And Reactivation

## Feature / Component

- Feature: Subscription Service
- Component: Subscription lifecycle API
- Priority: P1
- Branch: `feature/subscription-cancel-reactivate`
- Developer owner: Developer sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket009ImplementSubscriptionLifecycleApis
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Goal

Support end-of-period cancellation and reactivation before cancellation takes effect.

## Scope

The agent must:
- Implement or confirm `POST /v1/subscriptions/{subscription_id}/cancel`.
- Implement `POST /v1/subscriptions/{subscription_id}/reactivate`.
- Expose cancellation state in current subscription responses.
- Remove paid entitlements only after cancellation becomes effective.

The agent must not:
- Cancel immediately unless a separate admin policy explicitly requests it.
- Delete historical subscription records.

## Implementation Notes

- Cancellation should set end-of-period state by default.
- Reactivation must clear pending cancellation state only before effective cancellation.
- Lifecycle changes must be auditable.

## Acceptance Criteria

- WHEN cancellation is requested, THEN entitlements remain active until period end.
- WHEN reactivation is requested before period end, THEN the subscription remains active.
- WHEN cancellation is effective, THEN paid features no longer appear in entitlements.

## Regression / Compatibility Tests

- Confirm normal active subscription entitlement output is unchanged.
- Confirm cancelled subscriptions no longer grant paid features.
- Confirm reactivation does not create duplicate subscriptions.

## Out Of Scope

- Refunds.
- Payment-provider cancellation calls.
