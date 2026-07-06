# 029 - Add Provider Adapter Contract Tests

## Feature / Component

- Feature: Quality
- Component: Provider tests
- Priority: P1
- Suggested owner: Payments Engineer
- Dependencies: Ticket014ImplementStripePaymentintentsAdapter, Ticket015ImplementPaypalOrdersAdapter

## Task

Test provider adapters with mocked provider HTTP APIs for request formation, response mapping, errors, and webhook parsing.

## Implementation Notes

- Do not require live provider credentials in unit/contract tests.
- Use representative Stripe PaymentIntent and PayPal Order/Capture payloads.

## Acceptance Criteria

- WHEN Stripe adapter tests run, THEN PaymentIntent creation and refund mapping are covered.
- WHEN PayPal adapter tests run, THEN order creation, capture, and refund mapping are covered.
- IF a provider returns malformed data, THEN the adapter returns a typed error.
- WHEN provider returns known statuses, THEN canonical status mappings are asserted.
- IF webhook signatures are invalid in tests, THEN parsing or verification fails safely.

## Out Of Scope

Live sandbox smoke tests and load tests.
