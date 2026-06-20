# 013 - Implement Idempotency Layer

## Feature / Component

- Feature: Reliability
- Component: Idempotency
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-013-idempotency`
- Dependencies: Ticket007CreateDatabaseMigrationFramework

## Task

Implement idempotency for create and mutation endpoints.

## Implementation Notes

- Use `Idempotency-Key` request header.
- Scope keys by client/service and endpoint where appropriate.
- Persist request hash and response outcome.

## Acceptance Criteria

- Repeated create requests with the same idempotency key return the same booking outcome.
- Reusing a key with a different request payload is rejected.
- Idempotency storage is transactional with booking creation.

## Out Of Scope

Cross-service distributed transactions.
