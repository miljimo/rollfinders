# 020 - Implement List Refunds Endpoint

## Feature / Component

- Feature: Refund APIs
- Component: GET /v1/payments/{id}/refunds
- Priority: P1
- Suggested owner: Backend Engineer
- Dependencies: Ticket019ImplementRefundEndpoint

## Task

Expose deterministic refund history for a payment.

## Implementation Notes

- Return refund status, amount, currency, provider reference, reason, and timestamps.
- Omit provider raw payloads and secrets.

## Acceptance Criteria

- WHEN refunds exist for a payment, THEN the API returns them in deterministic order.
- IF the payment does not exist, THEN the API returns `404`.
- WHEN no refunds exist, THEN the API returns an empty list.
- IF the request is unauthorized, THEN refund details are not returned.
- WHEN the response is returned, THEN it matches the OpenAPI schema.

## Out Of Scope

Refund search across all payments and reporting UI.
