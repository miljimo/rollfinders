# 020 - Implement Attendance Tracking Endpoints

## Feature / Component

- Feature: Booking APIs
- Component: Attendance
- Priority: P1
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-020-attendance-endpoints`
- Dependencies: Ticket011ImplementParticipantLifecycle, Ticket019ImplementParticipantManagementEndpoints

## Task

Implement check-in and attendance marking for booking participants.

## Implementation Notes

- Suggested endpoints: `POST /v1/bookings/{id}/participants/{participant_id}/check-in` and `/attend`.
- Store `checked_in_at` and `attended_at`.
- Support actor context for audit.

## Acceptance Criteria

- Checked-in participants get `checked_in_at`.
- Attended participants get `attended_at`.
- Invalid status transitions are rejected.
- Repeated calls are idempotent or return the existing timestamp.

## Out Of Scope

QR scanning UI and attendance analytics.
