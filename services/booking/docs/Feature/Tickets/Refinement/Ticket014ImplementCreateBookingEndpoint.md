# 014 - Implement Create Booking Endpoint

## Feature / Component

- Feature: Booking APIs
- Component: `POST /v1/bookings`
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-014-create-booking`
- Dependencies: Ticket009ImplementDataAccessFunctions, Ticket010ImplementBookingLifecycleStateMachine, Ticket013ImplementIdempotencyLayer

## Task

Implement booking creation for any bookable resource.

## Implementation Notes

- Required fields: `customer_id`, `bookable_type`, `bookable_id`, `quantity`.
- Optional fields: `organisation_id`, `bookable_instance_id`, times, amount, currency, payment flags, metadata.
- Do not validate resource availability.
- Do not process payments.

## Acceptance Criteria

- Valid create requests return `201` with booking details.
- Missing required fields return validation errors.
- Payment-required bookings can store `payment_required=true` and optional `payment_id`.
- Created bookings include initial status and booking reference.
- No user, organisation, resource, or payment details are copied into the booking.

## Out Of Scope

Availability checks and payment creation.
