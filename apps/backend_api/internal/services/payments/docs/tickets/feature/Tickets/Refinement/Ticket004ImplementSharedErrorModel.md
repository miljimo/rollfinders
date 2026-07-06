# 004 - Implement Shared API Error Model

## Feature / Component

- Feature: API Contract
- Component: HTTP error handling
- Priority: P0
- Suggested owner: Backend Engineer
- Dependencies: Ticket001BootstrapGoApiService, Ticket003DefineOpenapiMvpContract

## Task

Implement canonical JSON errors with code, message, request ID, and optional safe details.

## Implementation Notes

- Normalize validation, auth, idempotency, provider, state, and internal errors.
- Do not leak provider secrets, raw provider payloads, or internal stack traces.

## Acceptance Criteria

- WHEN validation fails, THEN the API returns `400` with the shared error shape.
- WHEN an idempotency conflict occurs, THEN the API returns `409` with `idempotency_conflict`.
- IF an unexpected error occurs, THEN the API returns `500` without leaking internal details.
- WHEN any error response is emitted, THEN it includes a request ID.
- IF provider errors occur, THEN they are mapped to stable public error codes.

## Out Of Scope

Full observability dashboards, provider adapter implementation.
