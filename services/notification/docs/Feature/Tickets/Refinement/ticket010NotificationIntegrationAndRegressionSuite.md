# 010 - Notification Integration And Regression Suite

## Feature / Component

- Feature: Notification Service quality
- Component: Integration, regression, and release gates
- Priority: P0
- Status: Partially Implemented
- Branch: `feature/notification-regression-suite`
- Developer owner: Notification Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket001NotificationServiceSkeleton through Ticket009EventsMetricsAndAuditVisibility
- Source PRD: `services/notification/docs/product.md`

## Task

Create the end-to-end and regression test suite for Notification Service and initial platform service integration.

## Implementation Notes

- Add unit tests for validation, status lifecycle, retry schedule, priority ordering, and provider failure classification.
- Add database tests for schema constraints, idempotency, queue locking, status transitions, and search filters.
- Add API tests for create, search, details, unauthorized, validation failure, duplicate idempotency, attachments, and metadata.
- Add worker tests for successful send, retryable failure, permanent failure, exhausted retries, and restart recovery.
- Add integration tests with a fake/local SMTP server.
- Add at least one business-service integration example, preferably Booking Service submitting a booking confirmation notification without moving booking content generation into Notification Service.
- Keep the Next.js web app integrated through the Notification Service API rather than public email queue tables.
- Add local compose/test documentation.
- Keep tests deterministic; avoid live email provider calls unless explicitly enabled by environment flag.

## Acceptance Criteria

- WHEN tests run locally, THEN core Notification Service API, worker, database, and provider flows pass.
- WHEN duplicate idempotency scenarios run, THEN duplicate notifications are prevented.
- WHEN temporary provider failures run, THEN retry status and next attempt schedule match the PRD.
- WHEN maximum attempts are exhausted, THEN final status is `FAILED_PERMANENT`.
- WHEN a business service submits notification content, THEN Notification Service queues and sends without interpreting business metadata.
- WHEN the web app submits Email notifications, THEN it calls Notification Service and does not read or write public notification queue tables.
- WHEN CI runs, THEN tests fail on API contract or lifecycle regressions.

## Regression / Compatibility Tests

- Tina SHALL own the notification regression matrix.
- Tina SHALL verify app, booking, users, courses, payments, and notification services still run together in local Docker.

## Current State

Partially implemented. Unit tests exist for server, provider, and worker packages, a Python ownership/regression scaffold checks notification table ownership, and the web app adapter now calls `POST /v1/notifications` instead of public Prisma email queue tables. Live database migration tests, end-to-end API/worker tests, fake SMTP integration through compose, and Booking Service submission integration remain outstanding.

## Out Of Scope

Load testing beyond MVP-scale smoke tests and live provider certification.
