# 003 - Booking Database Schema

## Feature / Component

- Feature: Booking Service
- Component: Database schema
- Priority: P0
- Branch: `feature/booking-core-schema`
- Developer owner: Booking Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket001BookingServiceSkeleton
- Source PRD: `docs/services/booking/proposal.md`

## Task

Create the Booking Service database-first migration structure and core schema for bookings, participants, status history, idempotency, and outbox events.

## Implementation Notes

- Use `apps/backend_api/migrations/booking/schema`, `tables`, `types`, `functions`, and `procedures`.
- Use text IDs, not UUID-only IDs.
- Add `booking.bookings`, `booking.booking_participants`, `booking.booking_status_history`, `booking.idempotency_keys`, and `booking.outbox_events`.
- Add indexes for customer, organisation, bookable instance, payment, and status filters.
- Add duplicate active booking protection for registered customers.
- Keep one function/procedure per file.
- Use camelCase file names for functions/procedures and camelCase database function/procedure names.

## Acceptance Criteria

- WHEN migrations run against PostgreSQL, THEN all booking schema objects are created successfully.
- WHEN duplicate active registered-user bookings are inserted for the same bookable instance, THEN the database rejects the duplicate.
- WHEN schema files are reviewed, THEN each table/function/procedure is isolated in a clear file.
- WHEN IDs are inspected, THEN they are text-compatible with existing RollFinders IDs.

## Regression / Compatibility Tests

- Tina SHALL run migrations on a clean local database.
- Tina SHALL add migration contract tests for required tables, indexes, and duplicate constraints.

## Out Of Scope

Go data access implementation.
