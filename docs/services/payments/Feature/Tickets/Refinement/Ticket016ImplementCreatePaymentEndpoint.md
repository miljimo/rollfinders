# 016 - Implement Create Payment Endpoint

## Feature / Component

- Feature: Payment APIs
- Component: POST /v1/payments
- Priority: P0
- Suggested owner: Backend Engineer
- Dependencies: Ticket011ImplementIdempotencyLayer, Ticket012DefineProviderAdapterInterface, Ticket013ImplementApiAuthentication, Ticket014ImplementStripePaymentintentsAdapter, Ticket015ImplementPaypalOrdersAdapter

## Task

Expose `POST /v1/payments` to create card and PayPal one-time payments through the provider abstraction.

## Implementation Notes

- Accept amount, currency, provider, payment method type, capture method, external reference, and metadata.
- Return canonical status and safe client action details.
- Use idempotency for all creates.

## Acceptance Criteria

- WHEN a valid create payment request is sent, THEN a local payment record is created.
- WHEN provider creation succeeds, THEN provider IDs and canonical status are stored.
- IF provider creation fails, THEN the API returns a normalized error and records safe failure details.
- WHEN the same request is retried with the same idempotency key, THEN no duplicate provider payment is created.
- WHEN the response is returned, THEN it matches the OpenAPI schema.

## Out Of Scope

Saved payment methods, subscriptions, checkout UI.
