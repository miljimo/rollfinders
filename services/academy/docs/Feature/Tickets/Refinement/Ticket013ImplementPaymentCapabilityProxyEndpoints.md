# 013 - Implement Payment Capability Proxy Endpoints

## Feature / Component

- Feature: Academy Service
- Component: Payments capability facade
- Priority: P1
- Branch: `feature/academy-payment-capability-proxy`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Tickets 004, 009
- Source PRD: `services/academy/docs/product.md`

## Task

Expose academy-facing payment capability endpoints that proxy to Payments Service without owning payment state.

## Implementation Notes

- Implement `GET /v1/academies/{academy_id}/payment-status`.
- Implement onboarding start/refresh/disconnect proxy routes if the UI needs academy-context URLs.
- Do not store Stripe account IDs, Stripe keys, onboarding status, payouts, charges, refunds, transactions, or balances in Academy Service.
- Use Payments Service as source of truth for connected account and payout capability.
- Return a small normalized summary for academy dashboard use.

## Acceptance Criteria

- WHEN payment status is requested, THEN Academy Service returns a summary derived from Payments Service.
- WHEN Payments Service is unavailable, THEN Academy Service returns a clear dependency error.
- WHEN code is reviewed, THEN no Stripe-specific table or secret exists in Academy Service.

## Regression / Compatibility Tests

- Tina SHALL add tests for available, pending, disabled, and dependency-unavailable payment capability responses.

## Out Of Scope

Payments Service implementation and Stripe Connect onboarding logic.
