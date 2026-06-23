# 007 - Queue Worker And Retry Processing

## Feature / Component

- Feature: Notification Service
- Component: Asynchronous queue worker, delivery lifecycle, and retries
- Priority: P0
- Status: Implemented
- Branch: `feature/notification-worker-retries`
- Developer owner: Notification Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket004NotificationDataAccessLayer, Ticket005EmailProviderAbstraction, Ticket006CreateNotificationEndpoint
- Source PRD: `services/notification/docs/product.md`

## Task

Implement worker processing for queued notifications, including status transitions, provider send, retry schedule, and permanent failure handling.

## Implementation Notes

- Worker SHALL poll due notifications from persisted queue storage.
- Worker SHALL lock a notification before delivery and set status `PROCESSING`.
- Worker SHALL deliver through the configured provider.
- On success, set status `SENT`, store provider name, provider message ID, provider response, attempt history, and `sent_at`.
- On retryable failure, set status `FAILED_RETRYABLE` or `RETRYING`, increment attempt count, record attempt history, store last error, and set `next_attempt_at`.
- On permanent failure or exhausted attempts, set status `FAILED_PERMANENT`.
- Implement retry schedule:
  - Attempt 1: immediate
  - Attempt 2: 1 minute
  - Attempt 3: 5 minutes
  - Attempt 4: 15 minutes
  - Attempt 5: 1 hour
- Stop retrying after 5 attempts.
- Process higher priority notifications before lower priority notifications where due times are equal.
- Make worker batch size, poll interval, and concurrency configurable.

## Acceptance Criteria

- WHEN a queued notification is processed successfully, THEN status becomes `SENT`.
- WHEN a temporary provider failure occurs, THEN status becomes retryable and next attempt time follows the PRD schedule.
- WHEN maximum retries are exceeded, THEN status becomes `FAILED_PERMANENT`.
- WHEN multiple workers run concurrently, THEN a notification is not sent more than once.
- WHEN notification priority differs, THEN due higher-priority notifications are selected first.
- WHEN every attempt runs, THEN immutable attempt history is recorded.

## Regression / Compatibility Tests

- Tina SHALL add worker tests for success, retryable failure, permanent failure, exhausted retries, priority ordering, locking, batch processing, and worker restart recovery.

## Out Of Scope

Provider failover and scheduled future notification creation.
