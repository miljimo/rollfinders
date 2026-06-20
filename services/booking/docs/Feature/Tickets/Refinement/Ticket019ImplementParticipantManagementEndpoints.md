# 019 - Implement Participant Management Endpoints

## Feature / Component

- Feature: Booking APIs
- Component: Participants
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-019-participant-endpoints`
- Dependencies: Ticket011ImplementParticipantLifecycle

## Task

Implement participant add, list, update, and remove/cancel endpoints.

## Implementation Notes

- Suggested endpoints under `/v1/bookings/{id}/participants`.
- Participants store `user_id`, role, status, metadata, and timestamps only.
- Keep response generic.

## Acceptance Criteria

- Participants can be added to an existing booking.
- Participants can be listed for a booking.
- Participant role/status can be updated.
- Removing a participant does not delete audit-relevant history if status-based cancellation is preferred.

## Out Of Scope

User lookup and participant invitations.
