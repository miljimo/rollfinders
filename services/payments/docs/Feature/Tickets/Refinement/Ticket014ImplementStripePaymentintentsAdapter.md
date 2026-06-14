# 014 - Implement Stripe PaymentIntents Adapter

## Feature / Component

- Feature: Provider Integrations
- Component: Stripe
- Priority: P0
- Suggested owner: Payments Engineer
- Dependencies: Ticket011ImplementIdempotencyLayer, Ticket012DefineProviderAdapterInterface

## Task

Implement Stripe PaymentIntent creation, status mapping, provider idempotency, and safe error normalization.

## Implementation Notes

- Use Stripe PaymentIntents for cards.
- Use Stripe.js or hosted collection on the client side; this service must never accept PAN or CVV.
- Pin/configure Stripe API version intentionally.

## Acceptance Criteria

- WHEN a Stripe payment is created, THEN a PaymentIntent is created with amount, currency, metadata, and provider idempotency key.
- IF Stripe requires action, THEN the adapter returns `requires_action` plus safe client action data.
- WHEN Stripe returns succeeded, failed, cancelled, or processing statuses, THEN they map to canonical domain statuses.
- IF Stripe returns an error, THEN the adapter returns a normalized provider error.
- WHEN provider request IDs are returned, THEN they are available for safe logging and diagnostics.

## Out Of Scope

Stripe subscriptions, saved cards, Connect, disputes.
