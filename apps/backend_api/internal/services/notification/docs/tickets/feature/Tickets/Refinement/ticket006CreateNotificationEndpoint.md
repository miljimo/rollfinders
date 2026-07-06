# 006 - Create Notification Endpoint

## Feature / Component

- Feature: Notification Service
- Component: `POST /notifications`
- Priority: P0
- Status: Implemented
- Branch: `feature/notification-create-endpoint`
- Developer owner: Notification Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket002NotificationApiContract, Ticket004NotificationDataAccessLayer
- Source PRD: `apps/backend_api/internal/services/notification/docs/product.md`

## Task

Implement the create notification endpoint that validates and queues notification requests.

## Implementation Notes

- Implement `POST /notifications`.
- Require internal service authentication and `notification.create` permission where the authorization service pattern supports permissions.
- Validate channel, priority, subject/content requirements, sender, recipients, attachments, metadata size, and idempotency key.
- Accept only `EMAIL` channel in v1.
- Persist valid requests with status `QUEUED`.
- Store arbitrary metadata without interpretation.
- Return the original notification response for duplicate idempotency keys.
- Return stable JSON error envelopes for validation, unauthorized, conflict, and internal errors.
- Publish `NOTIFICATION_CREATED` only after successful persistence if event publishing is already available in the service foundation; otherwise leave a clear integration point for Ticket009.

## Acceptance Criteria

- WHEN a valid Email notification is submitted, THEN the service returns `notificationId` and status `QUEUED`.
- WHEN the request has duplicate idempotency key, THEN no duplicate notification is created and the original response is returned.
- WHEN unsupported channels are submitted, THEN validation fails.
- WHEN required recipient or content fields are missing, THEN validation fails with a stable error envelope.
- WHEN metadata is submitted, THEN it is stored exactly as opaque JSON.

## Regression / Compatibility Tests

- Tina SHALL add API tests for success, validation failure, unauthorized, unsupported channel, duplicate idempotency, attachments, cc, bcc, and metadata.

## Out Of Scope

Worker delivery and search endpoints.
