# 003 - Notification Database Schema

## Feature / Component

- Feature: Notification Service
- Component: Database migrations and indexes
- Priority: P0
- Status: Implemented
- Branch: `feature/notification-database-schema`
- Developer owner: Notification Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket001NotificationServiceSkeleton, Ticket002NotificationApiContract
- Source PRD: `docs/services/notification/product.md`

## Task

Create Notification Service persistence tables for generic notifications, Email-specific message data, Email-specific recipients, attachments, and delivery attempts.

## Implementation Notes

- Add generic `notifications` table with channel, priority, status, metadata, idempotency key, provider data, attempts, next attempt time, last error, sent time, created time, and updated time.
- Add Email-specific `email_messages` table with subject, content, sender, and reply-to fields.
- Add Email-specific `email_recipients` table with `TO`, `CC`, and `BCC` recipient types.
- Add `notification_attachments` table storing attachment metadata and `storage_url`.
- Add `notification_attempts` table for immutable delivery attempt history.
- Add foreign keys from child tables to `notifications`.
- Add unique idempotency protection for duplicate create requests.
- Add indexes for queue polling, status, channel, recipient email, source service metadata lookup, and created date range searches.
- Add check constraints for supported enum-like values where the repository database style supports them.

## Acceptance Criteria

- WHEN migrations run on a clean database, THEN all notification tables and indexes are created.
- WHEN duplicate idempotency keys are inserted within the same client scope, THEN the database prevents duplicate notification creation.
- WHEN a notification is deleted or archived according to the chosen policy, THEN child records do not become orphaned.
- WHEN queue polling queries are explained, THEN they use the intended status and next-attempt indexes.
- WHEN migrations are rolled back where supported, THEN notification schema changes are reversible.

## Regression / Compatibility Tests

- Tina SHALL add migration tests for clean apply, rollback if supported, constraints, and duplicate idempotency behavior.

## Current State

Implemented. The current schema keeps `notification.notifications` channel-generic and stores Email-specific content in `notification.email_messages` and `notification.email_recipients`.

## Out Of Scope

Data access functions and worker processing.
