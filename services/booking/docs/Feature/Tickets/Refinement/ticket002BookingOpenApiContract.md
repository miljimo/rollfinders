# 002 - Booking OpenAPI Contract

## Feature / Component

- Feature: Booking Service
- Component: OpenAPI contract
- Priority: P0
- Branch: `feature/booking-openapi-contract`
- Developer owner: Booking Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket001BookingServiceSkeleton
- Source PRD: `services/booking/docs/proposal.md`

## Task

Define the Booking Service `/v1` OpenAPI contract for booking creation, lookup, listing, cancellation, confirmation, payment-linking, participants, and attendance.

## Implementation Notes

- Keep schemas generic: use `bookable_type`, `bookable_id`, `bookable_instance_id`, `customer_id`, `guest_reference`, `organisation_id`, and `payment_id`.
- Do not include course, academy, Stripe, PayPal, or RollFinders-specific objects in core schemas.
- Include idempotency requirements for all mutation endpoints.
- Define pagination fields for list endpoints.
- Define stable error codes for duplicate bookings, invalid status transitions, invalid payment links, unauthorized requests, and unavailable dependencies.
- Use examples for `bookable_type=course_occurrence` as RollFinders MVP examples only.

## Acceptance Criteria

- WHEN the OpenAPI contract is reviewed, THEN it uses generic booking terminology.
- WHEN RollFinders course occurrence booking is described, THEN it maps cleanly to generic bookable fields.
- WHEN a future resource type is considered, THEN no core schema change is required.
- WHEN mutation endpoints are described, THEN idempotency behavior is specified.

## Regression / Compatibility Tests

- Tina SHALL add contract validation checks once the OpenAPI artifact exists.
- Tina SHALL verify the contract does not expose user profile, course detail, or payment provider fields.

## Out Of Scope

Endpoint implementation.
