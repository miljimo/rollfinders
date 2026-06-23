# 009 - Events Metrics And Audit Visibility

## Feature / Component

- Feature: Notification Service operations
- Component: Published events, metrics, and audit history
- Priority: P1
- Status: Partially Implemented
- Branch: `feature/notification-observability`
- Developer owner: Notification Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket006CreateNotificationEndpoint, Ticket007QueueWorkerAndRetryProcessing, Ticket008NotificationSearchAndDetailsEndpoints
- Source PRD: `services/notification/docs/product.md`

## Task

Add operational visibility for notification lifecycle events, metrics, and audit history.

## Implementation Notes

- Publish `NOTIFICATION_CREATED` after a notification is persisted.
- Publish `NOTIFICATION_SENT` after successful provider delivery.
- Publish `NOTIFICATION_FAILED` after retryable and permanent failures with status and attempt context.
- Publish `NOTIFICATION_CANCELLED` only if cancellation exists; otherwise document it as reserved.
- Expose metrics:
  - `notifications_created_total`
  - `notifications_sent_total`
  - `notifications_failed_total`
  - `notifications_retry_total`
  - `notification_queue_depth`
  - `notification_processing_count`
  - `notification_send_duration_ms`
- Ensure attempt history provides the PRD audit trail for created, queued, processing, sent, failed, and retry count.
- Avoid metric labels that include high-cardinality values such as raw email addresses or notification IDs.
- Include correlation/request IDs in logs and events where available.

## Acceptance Criteria

- WHEN a notification is created, THEN the created total metric increments and a created event is published.
- WHEN a notification is sent, THEN sent total and send duration metrics are recorded and a sent event is published.
- WHEN a retryable failure occurs, THEN failed/retry metrics are recorded and a failed event is published.
- WHEN queue depth is scraped, THEN it reflects due queued and retryable work.
- WHEN logs, events, and metrics are reviewed, THEN sensitive content and BCC data are not exposed.

## Regression / Compatibility Tests

- Tina SHALL add tests for lifecycle event publication, metric increments, queue depth calculation, and sensitive-data redaction.

## Current State

Partially implemented. Delivery attempt history is persisted and retry status is visible through data access and details responses. Published lifecycle events, metrics endpoints/exporters, queue depth metrics, processing count metrics, and send duration metrics are not implemented yet.

## Out Of Scope

Alert routing and dashboards outside the service repository.
