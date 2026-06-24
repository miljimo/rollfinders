# 011 - Implement Idempotency Layer

## Feature / Component

- Feature: Reliability
- Component: Idempotency
- Priority: P0
- Suggested owner: Backend Engineer
- Dependencies: Ticket005AddRequestValidationMiddleware, Ticket008ImplementRepositoryLayer

## Task

Implement service-level idempotency for all money-moving mutating endpoints.

## Implementation Notes

- Store request fingerprint, response snapshot, status code, resource ID, and expiry.
- Scope keys by operation and caller identity where applicable.
- Coordinate concurrent requests safely.

## Acceptance Criteria

- WHEN the same idempotency key and same request body are retried, THEN the original response is returned.
- IF the same idempotency key is reused with a different request body, THEN the API returns `409`.
- WHEN a request completes successfully, THEN its response is persisted for replay.
- IF a request fails before committing business state, THEN it is safe to retry.
- WHEN concurrent requests use the same idempotency key, THEN only one business operation is created.

## Out Of Scope

Provider-specific idempotency behavior inside adapters.
