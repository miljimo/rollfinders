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

- Use a database-first access model: application repositories must call stored procedures for writes and database functions for reads.
- Do not issue direct application SQL against payment tables except migration-managed DDL and narrowly scoped health/readiness checks.
- Keep business-critical state transitions, status history writes, idempotency persistence, and outbox creation in stored procedures where the database can enforce transactional consistency.
- Use explicit transactions for money-moving operations.
- Expose row-level locking helpers for payment and refund mutations.
- Return typed conflicts for unique constraint failures.

## Acceptance Criteria

- WHEN creating a payment, THEN the repository persists it transactionally.
- WHEN repositories read payments, checkouts, clients, refunds, payment history, or idempotency records, THEN they call payment schema functions instead of selecting from tables directly.
- WHEN repositories mutate clients, payments, checkouts, refunds, provider events, or idempotency records, THEN they call payment schema procedures instead of inserting or updating tables directly.
- WHEN updating payment state, THEN the repository appends payment status history.
- IF a duplicate idempotency key is saved, THEN the repository returns a typed conflict error.
- WHEN a payment is selected for mutation, THEN row-level locking can be requested.
- WHEN repository tests run against PostgreSQL, THEN core CRUD and constraint behavior are verified.

## Out Of Scope

HTTP endpoints and provider integrations.
