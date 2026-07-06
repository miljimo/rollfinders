# 011 - Paid Booking Checkout Integration

## Feature / Component

- Feature: RollFinders booking integration
- Component: Booking-first paid checkout
- Priority: P0
- Branch: `feature/paid-booking-checkout-flow`
- Developer owner: RollFinders Frontend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket007BookingPaymentLinkEndpoint, Ticket009RollFindersBookingClient
- Source PRD: `apps/backend_api/internal/services/booking/docs/prds/proposal.md`

## Task

Change paid and donation checkout flow so RollFinders creates a pending booking before creating Payment Service checkout.

## Implementation Notes

- Update `startCourseCheckout`.
- Validate course occurrence, academy trust, pricing, amount, and receipt email before creating booking.
- Create Booking Service record with `payment_required=true` and `pending_payment`.
- Create Payment Service checkout with `resource_type=booking` and `resource_id=booking.id`.
- Preserve course occurrence metadata in the payment request for dashboards and links.
- Link returned `payment_id` back to the booking.
- If checkout creation fails after booking creation, cancel or mark the pending booking failed through Booking Service.

## Acceptance Criteria

- WHEN paid checkout starts successfully, THEN a pending booking exists before redirecting to Stripe.
- WHEN checkout is created, THEN Payment Service resource is the booking id.
- WHEN Payment Service returns a payment id, THEN Booking Service stores it.
- WHEN Payment Service is unavailable, THEN pending booking is not left confirmed.
- WHEN donation checkout is used, THEN donation amount is recorded in booking/payment metadata.

## Regression / Compatibility Tests

- Tina SHALL test fixed-price and donation checkout flows.
- Tina SHALL test Payment Service unavailable and Booking Service unavailable paths.
- Tina SHALL verify unverified academies still cannot show or start payment.

## Out Of Scope

Payment success confirmation.
