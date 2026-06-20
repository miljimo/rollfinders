# 024 - Implement Status History And Audit Trail

## Feature / Component

- Feature: Events And Operations
- Component: Audit trail
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-024-status-history`
- Dependencies: Ticket008CreateCoreBookingSchema, Ticket010ImplementBookingLifecycleStateMachine

## Task

Write booking lifecycle changes to `booking_status_history`.

## Implementation Notes

- Capture old status, new status, optional actor, reason, and timestamp.
- History writes should happen in the same transaction as the booking status mutation.
- Include status history in get response only if OpenAPI includes it or via separate endpoint.

## Acceptance Criteria

- Every booking creation records initial status or clearly documents why initial creation is excluded.
- Every status mutation records old and new status.
- Failed booking mutations do not create history records.

## Out Of Scope

Participant history and external audit export.
