# 026 - Implement Metrics Endpoint

## Feature / Component

- Feature: Observability
- Component: Metrics
- Priority: P1
- Suggested owner: Platform Engineer
- Dependencies: Ticket016ImplementCreatePaymentEndpoint, Ticket019ImplementRefundEndpoint, Ticket021ImplementWebhookIngestionEndpoint

## Task

Expose Prometheus-compatible metrics for API requests, provider calls, payments, refunds, webhooks, and outbox processing.

## Implementation Notes

- Metrics should distinguish provider errors from internal service errors.
- Add webhook lag and outbox lag metrics.

## Acceptance Criteria

- WHEN `/metrics` is called, THEN it returns Prometheus-compatible metrics.
- WHEN API requests complete, THEN request count and latency metrics are updated.
- WHEN provider calls complete, THEN provider success and failure metrics are updated.
- WHEN webhook events are processed, THEN webhook counters and lag metrics are updated.
- IF metrics are disabled by config, THEN `/metrics` is unavailable or returns `404`.

## Out Of Scope

Managed dashboard provisioning and alert manager rules.
