# 023 - Implement Payment Service Linkage Adapter

## Feature / Component

- Feature: Integrations
- Component: Payment Service
- Priority: P1
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-023-payment-service-linkage`
- Dependencies: Ticket003DefineConfigurationAndEnvironmentContract, Ticket010ImplementBookingLifecycleStateMachine

## Task

Create a Payment Service adapter for validating or linking `payment_id` to bookings.

## Implementation Notes

- Booking Service must not process payments.
- Booking Service stores only `payment_id`.
- Payment status may influence booking confirmation only through explicit service calls or linkage validation.

## Acceptance Criteria

- Booking can store a payment ID.
- Optional validation can confirm payment existence/status with Payment Service.
- Payment transaction details are not copied into booking storage.
- Payment Service failures are handled predictably.

## Out Of Scope

Checkout creation, refunds, provider webhooks.
