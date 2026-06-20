# 011 - Implement Participant Lifecycle

## Feature / Component

- Feature: Booking Core
- Component: Participants
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-011-participant-lifecycle`
- Dependencies: Ticket008CreateCoreBookingSchema

## Task

Define participant roles, participant statuses, and legal participant lifecycle changes.

## Implementation Notes

- Suggested roles: `customer`, `attendee`, `instructor`, `host`, `staff`, `guest`.
- Suggested statuses: `active`, `cancelled`, `checked_in`, `attended`, `no_show`.
- Store only `user_id`; do not copy user profile data.

## Acceptance Criteria

- Participants can be added to a booking.
- Duplicate participant rules are defined and enforced.
- Check-in and attendance timestamps are stored.
- Participant status changes do not require resource-specific logic.

## Out Of Scope

User profile retrieval and attendance UI.
