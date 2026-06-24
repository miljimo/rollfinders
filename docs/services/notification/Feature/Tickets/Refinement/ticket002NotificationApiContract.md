# 002 - Notification API Contract

## Feature / Component

- Feature: Notification Service
- Component: OpenAPI contract and request/response models
- Priority: P0
- Status: Implemented
- Branch: `feature/notification-api-contract`
- Developer owner: Notification Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket001NotificationServiceSkeleton
- Source PRD: `docs/services/notification/product.md`

## Task

Define the Notification Service API contract for create, search, and details endpoints.

## Implementation Notes

- Add an OpenAPI contract for `POST /notifications`.
- Add an OpenAPI contract for `GET /notifications`.
- Add an OpenAPI contract for `GET /notifications/{notificationId}`.
- Model channel values with `EMAIL` as the only v1 accepted value.
- Model priority values: `CRITICAL`, `HIGH`, `NORMAL`, `LOW`, `BULK`.
- Model status values: `CREATED`, `QUEUED`, `PROCESSING`, `SENT`, `FAILED_RETRYABLE`, `RETRYING`, `FAILED_PERMANENT`, and `CANCELLED` if cancellation is exposed later.
- Include request models for sender, recipients, cc, bcc, attachments, metadata, and idempotency key.
- Include response models for notification summary, notification details, recipients, attachments, and attempts.
- Document stable error envelopes for validation, unauthorized, not found, conflict, and internal errors.

## Acceptance Criteria

- WHEN the OpenAPI contract is linted, THEN it passes repository API contract checks.
- WHEN `POST /notifications` is documented, THEN the response includes `notificationId` and `status`.
- WHEN search filters are documented, THEN status, channel, recipient, date range, and source service are included.
- WHEN details are documented, THEN attempts, recipients, attachments, metadata, provider fields, and timestamps are represented.
- WHEN Email-only v1 constraints are reviewed, THEN future channels are not accepted by the contract.

## Regression / Compatibility Tests

- Tina SHALL add contract tests for required fields, enum validation, error envelopes, and response shape.

## Out Of Scope

Implementing handlers or database persistence.
