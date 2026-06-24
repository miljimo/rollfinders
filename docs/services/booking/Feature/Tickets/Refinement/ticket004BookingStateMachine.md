# 004 - Booking State Machine

## Feature / Component

- Feature: Booking Service
- Component: Booking lifecycle domain
- Priority: P0
- Branch: `feature/booking-state-machine`
- Developer owner: Booking Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket002BookingOpenApiContract
- Source PRD: `docs/services/booking/proposal.md`

## Task

Implement the booking and participant lifecycle rules used by create, confirm, cancel, complete, failed, no-show, and manual-review flows.

## Implementation Notes

- Support statuses: `pending_payment`, `confirmed`, `cancelled`, `completed`, `no_show`, `manual_review`, and `failed`.
- Free bookings create as `confirmed`.
- Paid bookings create as `pending_payment`.
- Only trusted server-side callers can confirm paid bookings.
- Browser redirects must not be accepted as payment proof.
- Keep lifecycle functions small, deterministic, and unit-testable.
- Use camelCase function names.

## Acceptance Criteria

- WHEN a free booking is created, THEN initial status is `confirmed`.
- WHEN a paid booking is created, THEN initial status is `pending_payment`.
- WHEN an invalid transition is requested, THEN the service returns a stable conflict error.
- WHEN status changes, THEN status history and outbox intent are produced.

## Regression / Compatibility Tests

- Tina SHALL add domain tests for every allowed and rejected transition.
- Tina SHALL verify payment-required bookings cannot be confirmed without trusted payment handling.

## Out Of Scope

HTTP endpoint wiring.
