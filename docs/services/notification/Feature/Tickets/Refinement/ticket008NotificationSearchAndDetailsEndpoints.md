# 008 - Notification Search And Details Endpoints

## Feature / Component

- Feature: Notification Service
- Component: Operational read APIs
- Priority: P1
- Status: Implemented
- Branch: `feature/notification-search-details`
- Developer owner: Notification Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket004NotificationDataAccessLayer, Ticket006CreateNotificationEndpoint, Ticket007QueueWorkerAndRetryProcessing
- Source PRD: `docs/services/notification/product.md`

## Task

Implement notification search and detail endpoints for platform administrators and service troubleshooting.

## Implementation Notes

- Implement `GET /notifications`.
- Implement `GET /notifications/{notificationId}`.
- Require internal service authentication and `notification.search` or `notification.view` permissions where supported.
- Support filters for status, channel, recipient, date range, and source service.
- Support pagination and stable sort order.
- Include delivery status, attempt count, provider fields, last error, timestamps, recipients, attachments, and metadata in detail responses.
- Include attempt history in details.
- Redact BCC recipients from roles that do not have audit/admin permission if the authorization model supports role-specific response shaping.
- Keep metadata opaque and return it as stored.

## Acceptance Criteria

- WHEN search filters are supplied, THEN matching notifications are returned with pagination metadata.
- WHEN an existing notification is requested, THEN details include recipients, attachments, metadata, delivery status, provider data, and attempt history.
- WHEN a notification is missing, THEN `404` is returned with a stable error envelope.
- WHEN unauthorized callers access read endpoints, THEN access is denied.
- WHEN source service filter is supplied, THEN it matches the stored metadata value without hardcoding business-service fields elsewhere.

## Regression / Compatibility Tests

- Tina SHALL add API tests for search filters, pagination, details, not found, unauthorized, BCC handling, and opaque metadata.

## Out Of Scope

Admin frontend dashboards.
