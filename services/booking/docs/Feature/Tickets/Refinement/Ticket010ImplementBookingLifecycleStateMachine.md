# 010 - Implement Booking Lifecycle State Machine

## Feature / Component

- Feature: Booking Core
- Component: Domain state
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-010-lifecycle-state-machine`
- Dependencies: Ticket008CreateCoreBookingSchema

## Task

Define and enforce booking lifecycle states and legal transitions.

## Implementation Notes

- Suggested states: `pending`, `confirmed`, `cancelled`, `completed`, `expired`.
- Support payment-required bookings remaining pending until payment linkage/confirmation.
- Keep state machine generic and independent of resource domain.

## Acceptance Criteria

- Illegal state transitions are rejected.
- Cancelling stores `cancelled_at` and optional reason.
- Confirming stores `confirmed_at`.
- Completing stores `completed_at`.
- Every accepted transition can be audited.

## Out Of Scope

Payment provider callbacks and scheduling/availability.
