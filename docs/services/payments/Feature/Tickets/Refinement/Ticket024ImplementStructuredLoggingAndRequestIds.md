# 024 - Implement Structured Logging And Request IDs

## Feature / Component

- Feature: Observability
- Component: Logging
- Priority: P0
- Suggested owner: Platform Engineer
- Dependencies: Ticket001BootstrapGoApiService, Ticket004ImplementSharedErrorModel

## Task

Add structured logs and request correlation across API requests, provider calls, webhooks, and outbox processing.

## Implementation Notes

- Reuse inbound request IDs when supplied.
- Generate request IDs when missing.
- Include provider request IDs where returned.

## Acceptance Criteria

- WHEN any request is handled, THEN logs include request ID, method, path, status, and duration.
- IF the client sends a request ID header, THEN it is reused.
- WHEN provider calls are made, THEN logs include provider name and payment or refund ID.
- IF an error occurs, THEN logs include error code without sensitive payment data.
- WHEN webhooks are processed, THEN logs include provider event ID and processing result.

## Out Of Scope

Metrics dashboards, tracing backend, alert routing.
