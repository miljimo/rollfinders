# 014 - Booking Regression Suite

## Feature / Component

- Feature: Booking Service quality
- Component: Test and release gates
- Priority: P0
- Branch: `feature/booking-regression-suite`
- Developer owner: Booking Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket006CoreBookingEndpoints, Ticket011PaidBookingCheckoutIntegration, Ticket012PaymentStatusBookingConfirmation
- Source PRD: `docs/services/booking/proposal.md`

## Task

Create the end-to-end and regression test suite for Booking Service and RollFinders booking integration.

## Implementation Notes

- Add Booking Service unit tests for domain lifecycle rules.
- Add database tests for procedures/functions, duplicate active booking protection, idempotency, and status history.
- Add API tests for create, get, list, cancel, confirm, payment-link, unauthorized, and invalid request paths.
- Add RollFinders integration tests for free booking, paid checkout booking creation, payment success confirmation, payment failure, and service unavailable errors.
- Add compose/local test documentation.
- Keep tests deterministic; avoid live payment provider calls unless explicitly enabled by env flag.

## Acceptance Criteria

- WHEN tests run locally, THEN core Booking Service and RollFinders booking flows pass.
- WHEN duplicate booking scenarios run, THEN duplicate active bookings are prevented.
- WHEN payment success/failure scenarios run, THEN booking status is correct.
- WHEN Booking Service is unavailable, THEN RollFinders displays helpful error messages.
- WHEN CI runs, THEN tests fail on contract-breaking changes.

## Regression / Compatibility Tests

- Tina SHALL own the booking regression matrix.
- Tina SHALL verify app, course, payment, and booking services still run together in local Docker.

## Out Of Scope

Load testing beyond MVP-scale smoke tests.
