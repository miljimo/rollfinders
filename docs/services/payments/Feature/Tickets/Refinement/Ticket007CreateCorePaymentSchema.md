# 007 - Create Core Payment Schema

## Feature / Component

- Feature: Persistence
- Component: Database schema
- Priority: P0
- Suggested owner: Backend Engineer
- Dependencies: Ticket006CreatePostgresqlMigrationFramework

## Task

Create the core PostgreSQL tables for payments, refunds, provider events, idempotency, status history, and outbox.

## Implementation Notes

- Store amounts as integer minor units plus currency code.
- Add provider IDs for Stripe PaymentIntent and PayPal Order/Capture references.
- Add uniqueness constraints for provider event IDs and idempotency keys.

## Acceptance Criteria

- WHEN migrations run, THEN `payments`, `refunds`, `provider_events`, `idempotency_keys`, `payment_status_history`, and `outbox_events` exist.
- IF duplicate provider event IDs are inserted, THEN the database rejects them.
- IF duplicate idempotency keys are inserted for the same scope, THEN the database rejects them.
- WHEN records are created, THEN created and updated timestamps are persisted.
- IF a payment stores provider references, THEN no raw card data fields are available.

## Out Of Scope

Repository methods and provider API calls.
