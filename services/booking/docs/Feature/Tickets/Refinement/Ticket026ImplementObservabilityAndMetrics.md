# 026 - Implement Observability And Metrics

## Feature / Component

- Feature: Events And Operations
- Component: Observability
- Priority: P1
- Suggested owner: Platform Engineer
- Branch name: `feature/booking-026-observability`
- Dependencies: Ticket001BootstrapGoApiService

## Task

Add structured logging, request IDs, safe diagnostics, and basic metrics for the booking service.

## Implementation Notes

- Log request method, path, status, duration, and request ID.
- Redact authorization headers and metadata values that may be sensitive.
- Expose metrics endpoint if consistent with other services.

## Acceptance Criteria

- Every request has a request ID.
- Errors are logged without leaking secrets.
- Health and readiness checks are visible in logs or metrics.
- Metrics include request counts and latency buckets if a metrics endpoint is implemented.

## Out Of Scope

Centralized log shipping.
