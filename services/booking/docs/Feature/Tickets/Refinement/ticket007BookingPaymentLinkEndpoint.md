# 007 - Booking Payment Link Endpoint

## Feature / Component

- Feature: Booking Service
- Component: Payment association API
- Priority: P0
- Branch: `feature/booking-payment-link`
- Developer owner: Booking Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket006CoreBookingEndpoints
- Source PRD: `services/booking/docs/proposal.md`

## Task

Implement the endpoint that links a Payment Service `payment_id` to a pending paid booking.

## Implementation Notes

- Implement `POST /v1/bookings/{id}/payment-link`.
- Request body must accept `payment_id`.
- Booking must be `pending_payment`.
- Booking must have `payment_required=true`.
- Linking the same payment id should be idempotent.
- Linking a different payment id to a booking that already has one must return conflict.
- Booking Service must not call Stripe or store provider transaction fields.

## Acceptance Criteria

- WHEN a payment id is linked to a valid pending paid booking, THEN the booking stores `payment_id`.
- WHEN the same request is replayed, THEN the response is idempotent.
- WHEN a different payment id is linked after one already exists, THEN the service returns conflict.
- WHEN a free booking is linked to payment, THEN the service rejects the request.

## Regression / Compatibility Tests

- Tina SHALL add API tests for valid link, replay, conflict, free-booking rejection, and missing payment id.

## Out Of Scope

Payment status polling or webhook handling.
