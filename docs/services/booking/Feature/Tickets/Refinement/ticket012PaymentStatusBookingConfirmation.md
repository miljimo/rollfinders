# 012 - Payment Status Booking Confirmation

## Feature / Component

- Feature: RollFinders booking integration
- Component: Trusted payment status confirmation
- Priority: P0
- Branch: `feature/payment-status-booking-confirmation`
- Developer owner: RollFinders Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket011PaidBookingCheckoutIntegration
- Source PRD: `docs/services/booking/proposal.md`

## Task

Confirm, fail, or cancel pending bookings from trusted Payment Service status handling.

## Implementation Notes

- Update RollFinders payment status/callback handling.
- Confirm booking only after trusted payment status is `succeeded`.
- Mark booking failed or cancelled for failed/cancelled payment results.
- Do not trust browser redirect alone as proof of payment.
- Use `payment_id`, `client_state`, or payment metadata to locate the booking.
- Keep confirmation idempotent.

## Acceptance Criteria

- WHEN payment succeeds, THEN the associated booking becomes `payment_received` and awaits academy confirmation.
- WHEN payment fails, THEN the associated booking becomes `failed` or remains non-confirmed.
- WHEN payment is cancelled, THEN the associated booking is cancelled or remains non-confirmed.
- WHEN callbacks are replayed, THEN booking status remains consistent.
- WHEN booking cannot be found, THEN the issue is logged and surfaced for manual review without corrupting payment state.

## Regression / Compatibility Tests

- Tina SHALL add tests for success, failed, cancelled, replayed, and missing-booking callback paths.
- Tina SHALL verify payment status page still renders clear user feedback.

## Out Of Scope

Refund handling.
