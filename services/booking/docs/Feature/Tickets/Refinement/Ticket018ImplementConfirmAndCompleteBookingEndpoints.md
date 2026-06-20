# 018 - Implement Confirm And Complete Booking Endpoints

## Feature / Component

- Feature: Booking APIs
- Component: Confirm and complete mutations
- Priority: P1
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-018-confirm-complete`
- Dependencies: Ticket010ImplementBookingLifecycleStateMachine, Ticket024ImplementStatusHistoryAndAuditTrail

## Task

Implement booking confirmation and completion endpoints.

## Implementation Notes

- Suggested endpoints: `POST /v1/bookings/{id}/confirm` and `POST /v1/bookings/{id}/complete`.
- Confirmation may be called after a payment service callback by another application service.
- Completion represents service/resource delivery completion, not payment capture.

## Acceptance Criteria

- Pending bookings can be confirmed.
- Confirmed bookings can be completed.
- Invalid transitions are rejected.
- Status history records each transition.

## Out Of Scope

Automated expiry jobs.
