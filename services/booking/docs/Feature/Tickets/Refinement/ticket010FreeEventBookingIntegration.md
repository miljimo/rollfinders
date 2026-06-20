# 010 - Free Event Booking Integration

## Feature / Component

- Feature: RollFinders booking integration
- Component: Free course/open-mat booking
- Priority: P0
- Branch: `feature/free-event-booking-service`
- Developer owner: RollFinders Frontend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket009RollFindersBookingClient
- Source PRD: `services/booking/docs/proposal.md`

## Task

Replace client-only free event booking state with persisted Booking Service records.

## Implementation Notes

- Update `FreeEventBookingButton` or its caller to use a server action.
- Validate course occurrence, academy trust, active status, and free pricing before creating a booking.
- Create Booking Service record with `bookable_type=course_occurrence`, `payment_required=false`, and confirmed status.
- Use occurrence key as `bookable_instance_id` until materialized Course Service sessions exist.
- Show confirmed booking feedback on success.
- Show duplicate booking and service-unavailable messages clearly.

## Acceptance Criteria

- WHEN a user books a free verified event, THEN a persisted confirmed booking is created.
- WHEN the same user books the same occurrence again, THEN duplicate active booking is prevented or treated idempotently.
- WHEN the academy is unverified/unclaimed, THEN the booking action is not available and server action rejects it.
- WHEN Booking Service is unavailable, THEN UI shows a helpful service unavailable message.

## Regression / Compatibility Tests

- Tina SHALL add integration tests for free booking success, duplicate booking, unverified academy rejection, and service unavailable.
- Tina SHALL verify paid checkout UI is unchanged by this ticket.

## Out Of Scope

Payment checkout integration.
