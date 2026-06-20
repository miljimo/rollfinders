# 008 - Create Core Booking Schema

## Feature / Component

- Feature: Persistence
- Component: Database schema
- Priority: P0
- Suggested owner: Database Engineer
- Branch name: `feature/booking-008-core-schema`
- Dependencies: Ticket007CreateDatabaseMigrationFramework

## Task

Create the core booking database schema from the PRD.

## Implementation Notes

- Create `bookings`, `booking_participants`, and `booking_status_history`.
- Add indexes for customer, organisation, bookable tuple, status, starts_at, payment_id, and booking_reference.
- Store only foreign identifiers for users, organisations, bookables, and payments.
- Use JSONB metadata for extension fields.

## Acceptance Criteria

- Migrations create all three PRD tables.
- `booking_reference` is unique.
- Foreign-domain details are not stored in booking tables.
- Timestamp fields exist for lifecycle tracking.
- Constraints prevent invalid quantity values.

## Out Of Scope

Repository/data-access implementation.
