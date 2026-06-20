# 012 - Implement Booking Reference Generation

## Feature / Component

- Feature: Booking Core
- Component: References
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-012-booking-reference`
- Dependencies: Ticket008CreateCoreBookingSchema

## Task

Implement unique human-readable booking reference generation.

## Implementation Notes

- References must be unique and stable.
- Avoid embedding customer, organisation, or bookable details.
- Use database uniqueness as the final collision guard.

## Acceptance Criteria

- Every booking gets a `booking_reference`.
- Duplicate generated references are retried or rejected safely.
- References are safe to show to users and support staff.

## Out Of Scope

Custom organisation-specific reference formats.
