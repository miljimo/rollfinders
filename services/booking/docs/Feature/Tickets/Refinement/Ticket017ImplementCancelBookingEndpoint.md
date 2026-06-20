# 017 - Implement Cancel Booking Endpoint

## Feature / Component

- Feature: Booking APIs
- Component: `POST /v1/bookings/{id}/cancel`
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-017-cancel-booking`
- Dependencies: Ticket010ImplementBookingLifecycleStateMachine, Ticket024ImplementStatusHistoryAndAuditTrail

## Task

Implement booking cancellation.

## Implementation Notes

- Accept optional cancellation reason.
- Accept optional `changed_by_user_id`.
- Do not issue refunds.
- Do not cancel external resources.

## Acceptance Criteria

- Cancellable bookings transition to `cancelled`.
- Already completed bookings cannot be cancelled.
- Cancellation stores timestamp and reason.
- Status history records the transition.

## Out Of Scope

Refund processing and notification dispatch.
