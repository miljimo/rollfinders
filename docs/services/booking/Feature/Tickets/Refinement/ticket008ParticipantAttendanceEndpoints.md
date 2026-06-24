# 008 - Participant Attendance Endpoints

## Feature / Component

- Feature: Booking Service
- Component: Participants and attendance
- Priority: P1
- Branch: `feature/booking-participant-attendance`
- Developer owner: Booking Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket006CoreBookingEndpoints
- Source PRD: `docs/services/booking/proposal.md`

## Task

Implement participant management and check-in endpoints for academy attendance workflows.

## Implementation Notes

- Implement `POST /v1/bookings/{id}/participants`.
- Implement `POST /v1/bookings/{id}/participants/{participant_id}/check-in`.
- Keep MVP roles limited to `customer`, `attendee`, and `guest`.
- Support participant statuses such as `booked`, `checked_in`, `attended`, `no_show`, and `cancelled`.
- Use camelCase function names for lifecycle helpers.
- Keep attendance rules separate from HTTP handlers.

## Acceptance Criteria

- WHEN a participant is added, THEN it is attached to the booking with a valid role/status.
- WHEN a participant is checked in, THEN `checked_in_at` is set and status changes.
- WHEN an invalid participant transition is requested, THEN conflict is returned.
- WHEN a cancelled booking is checked in, THEN the service rejects the request.

## Regression / Compatibility Tests

- Tina SHALL add participant and check-in API tests.
- Tina SHALL verify attendance changes do not alter payment state.

## Out Of Scope

QR-code scanning UI.
