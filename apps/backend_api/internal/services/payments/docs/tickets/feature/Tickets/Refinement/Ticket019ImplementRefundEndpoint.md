# 019 - Implement Refund Endpoint

## Feature / Component

- Feature: Refund APIs
- Component: POST /v1/payments/{id}/refunds
- Priority: P0
- Suggested owner: Payments Engineer
- Dependencies: Ticket010ImplementRefundStateMachine, Ticket014ImplementStripePaymentintentsAdapter, Ticket015ImplementPaypalOrdersAdapter, Ticket016ImplementCreatePaymentEndpoint

## Task

Expose full and partial refunds for succeeded payments using Stripe and PayPal provider adapters.

## Implementation Notes

- Prevent over-refunds.
- Support idempotent retries.
- Remember original processing fees may not be returned by providers.

## Acceptance Criteria

- WHEN a valid refund request is sent for a refundable payment, THEN a refund is created with the provider.
- IF the refund amount exceeds refundable balance, THEN the API returns `400`.
- WHEN the same refund request is retried with the same idempotency key, THEN no duplicate provider refund is created.
- WHEN a partial refund succeeds, THEN payment status becomes `partially_refunded`.
- WHEN total refunded amount equals captured amount, THEN payment status becomes `refunded`.

## Out Of Scope

Disputes, chargebacks, refund approval UI.
