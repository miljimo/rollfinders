# 004 - Notification Data Access Layer

## Feature / Component

- Feature: Notification Service
- Component: Repository functions and transactional persistence
- Priority: P0
- Status: Implemented
- Branch: `feature/notification-data-access`
- Developer owner: Notification Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket003NotificationDatabaseSchema
- Source PRD: `apps/backend_api/internal/services/notification/docs/product.md`

## Task

Implement database access functions for creating, fetching, searching, locking, updating, and recording notification attempts.

## Implementation Notes

- Implement transactional create that persists notification, recipients, attachments, metadata, and initial status.
- Implement idempotent create lookup returning the original notification for duplicate idempotency keys.
- Implement queue polling that fetches due `QUEUED`, `FAILED_RETRYABLE`, or `RETRYING` notifications by priority and `next_attempt_at`.
- Implement row-level locking for worker processing so multiple workers do not send the same notification.
- Implement status transition helpers for `QUEUED`, `PROCESSING`, `SENT`, `FAILED_RETRYABLE`, `RETRYING`, and `FAILED_PERMANENT`.
- Implement immutable attempt history insertion.
- Implement search by status, channel, recipient, date range, and source service metadata.
- Keep metadata opaque; do not add business-specific interpretation.

## Acceptance Criteria

- WHEN a valid notification create transaction succeeds, THEN parent and child records are persisted atomically.
- WHEN a duplicate idempotency key is submitted, THEN the original notification is returned without duplicate children.
- WHEN two workers poll concurrently, THEN only one worker locks a notification for delivery.
- WHEN an attempt is recorded, THEN status, attempt count, provider response, and error state remain consistent.
- WHEN search filters are supplied, THEN results are filtered and paginated deterministically.

## Regression / Compatibility Tests

- Tina SHALL add database tests for create, idempotency, queue locking, retry selection, status transitions, attempt history, and search filters.

## Out Of Scope

HTTP handlers and provider delivery.
