# 009 - Implement Data Access Functions

## Feature / Component

- Feature: Persistence
- Component: Data access
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-009-data-access`
- Dependencies: Ticket008CreateCoreBookingSchema

## Task

Implement database access functions for booking reads and writes.

## Implementation Notes

- Keep package name and folder structure consistent with service conventions.
- Prefer functions over stateful store structs unless connection lifecycle requires otherwise.
- Use stored functions/procedures for database-first behavior.
- Map database rows into domain types centrally.

## Acceptance Criteria

- Create, get, list, update status, and participant mutations are available as data-access functions.
- Data access functions accept context and database handle.
- SQL errors are mapped to domain-safe errors.
- Unit tests cover row mapping and error handling.

## Out Of Scope

HTTP handlers.
