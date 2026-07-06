# 005 - Booking Data Access Functions

## Feature / Component

- Feature: Booking Service
- Component: Data access
- Priority: P0
- Branch: `feature/booking-dataaccess-functions`
- Developer owner: Booking Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket003BookingDatabaseSchema, Ticket004BookingStateMachine
- Source PRD: `apps/backend_api/internal/services/booking/docs/prds/proposal.md`

## Task

Implement the Booking Service `dataaccess` package using stored functions/procedures through the internal `databases` wrapper.

## Implementation Notes

- Package name must be `dataaccess`.
- Do not create struct-style repository objects unless already required by local service conventions.
- Prefer package-level functions such as `CreateBooking`, `GetBooking`, `ListBookings`, `CancelBooking`, `ConfirmBooking`, and `LinkPayment`.
- Go file names must be CamelCase where the repo convention allows it.
- Database function/procedure files and names must be camelCase.
- Every database read/write must go through stored functions/procedures.
- Keep one primary data-access function per file when practical.

## Acceptance Criteria

- WHEN handlers call data access, THEN no raw SQL is embedded in handlers.
- WHEN data access is reviewed, THEN database calls go through the `databases` wrapper.
- WHEN stored functions/procedures are inspected, THEN names are camelCase and files match names.
- WHEN database errors occur, THEN data access maps them to domain-safe errors.

## Regression / Compatibility Tests

- Tina SHALL add data access tests for create, get, list, cancel, confirm, duplicate booking, and payment linking.
- Tina SHALL verify no handler package imports database driver types directly.

## Out Of Scope

Frontend integration.
