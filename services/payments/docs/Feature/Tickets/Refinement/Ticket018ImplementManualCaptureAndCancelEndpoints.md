# 018 - Implement Manual Capture And Cancel Endpoints

## Feature / Component

- Feature: Payment APIs
- Component: Capture and cancel
- Priority: P1
- Suggested owner: Payments Engineer
- Dependencies: Ticket016ImplementCreatePaymentEndpoint

## Task

Expose endpoints for manual capture and cancellation of eligible pending or authorized payments.

## Implementation Notes

- Manual capture primarily applies to supported card flows.
- Use row-level locks around capture and cancel.
- Reject invalid state transitions before provider calls.

## Acceptance Criteria

- WHEN `POST /v1/payments/{id}/capture` is called for an authorized payment, THEN the provider capture is attempted and local status is updated.
- IF capture is requested for an ineligible payment, THEN the API returns `payment_invalid_state`.
- WHEN `POST /v1/payments/{id}/cancel` is called for a cancellable payment, THEN provider cancellation is attempted and local status is updated.
- IF duplicate capture or cancel requests use the same idempotency key, THEN no duplicate provider operation is created.
- WHEN concurrent capture and cancel requests occur, THEN row-level locking allows only one valid transition.

## Out Of Scope

Multi-capture, partial capture unless provider support is explicitly added.
