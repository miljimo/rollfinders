# 008 - Implement Repository Layer

## Feature / Component

- Feature: Persistence
- Component: Data access
- Priority: P0
- Suggested owner: Backend Engineer
- Dependencies: Ticket007CreateCorePaymentSchema

## Task

Implement typed repositories for payments, refunds, idempotency records, provider events, status history, and outbox events.

## Implementation Notes

- Use explicit transactions for money-moving operations.
- Expose row-level locking helpers for payment and refund mutations.
- Return typed conflicts for unique constraint failures.

## Acceptance Criteria

- WHEN creating a payment, THEN the repository persists it transactionally.
- WHEN updating payment state, THEN the repository appends payment status history.
- IF a duplicate idempotency key is saved, THEN the repository returns a typed conflict error.
- WHEN a payment is selected for mutation, THEN row-level locking can be requested.
- WHEN repository tests run against PostgreSQL, THEN core CRUD and constraint behavior are verified.

## Out Of Scope

HTTP endpoints and provider integrations.
