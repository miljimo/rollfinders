# 005 - Add Request Validation Middleware

## Feature / Component

- Feature: API Contract
- Component: HTTP validation
- Priority: P0
- Suggested owner: Backend Engineer
- Dependencies: Ticket003DefineOpenapiMvpContract, Ticket004ImplementSharedErrorModel

## Task

Validate JSON payloads, content type, required headers, amount, currency, provider, and idempotency requirements.

## Implementation Notes

- Reject malformed JSON and unsupported content types.
- Validate amount as positive integer minor units.
- Validate currency as ISO-style uppercase code.

## Acceptance Criteria

- WHEN invalid JSON is submitted, THEN the API returns `400`.
- IF `Content-Type` is not JSON for JSON endpoints, THEN the API returns `415`.
- WHEN amount is zero or negative, THEN validation fails.
- WHEN currency is malformed, THEN validation fails.
- IF a mutating endpoint is missing `Idempotency-Key`, THEN the API returns `400`.

## Out Of Scope

Business state transitions and provider calls.
