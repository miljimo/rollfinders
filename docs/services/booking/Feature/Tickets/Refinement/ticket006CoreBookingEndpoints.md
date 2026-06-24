# 006 - Core Booking Endpoints

## Feature / Component

- Feature: Booking Service
- Component: Core booking API endpoints
- Priority: P0
- Branch: `feature/booking-core-endpoints`
- Developer owner: Booking Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket002BookingOpenApiContract, Ticket005BookingDataAccessFunctions
- Source PRD: `docs/services/booking/proposal.md`

## Task

Implement create, get, list, cancel, and confirm booking endpoints.

## Implementation Notes

- Implement `POST /v1/bookings`.
- Implement `GET /v1/bookings/{id}`.
- Implement `GET /v1/bookings`.
- Implement `POST /v1/bookings/{id}/cancel`.
- Implement `POST /v1/bookings/{id}/confirm`.
- Put each endpoint handler in its own server/api handler file.
- Reuse shared handler helpers for `writeError`, JSON decoding, validation, and response writing.
- Apply idempotency to create, cancel, and confirm.
- Keep endpoint code thin; domain rules belong in domain/state-machine functions.

## Acceptance Criteria

- WHEN a valid booking create request is posted, THEN the service returns a booking record.
- WHEN an existing booking is requested, THEN the service returns booking details and participants.
- WHEN list filters are supplied, THEN results are filtered and paginated.
- WHEN cancel/confirm requests are valid, THEN status changes and history is recorded.
- WHEN requests are invalid, THEN stable error envelopes are returned.

## Regression / Compatibility Tests

- Tina SHALL add API tests for success, validation failure, unauthorized, duplicate, idempotent replay, and invalid status transition paths.

## Out Of Scope

Payment Service checkout creation.
