# 015 - Implement Get Booking Endpoint

## Feature / Component

- Feature: Booking APIs
- Component: `GET /v1/bookings/{id}`
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-015-get-booking`
- Dependencies: Ticket009ImplementDataAccessFunctions

## Task

Implement retrieval of a single booking by ID.

## Implementation Notes

- Include participant summary or participants based on OpenAPI decision.
- Include lifecycle timestamps and status.
- Keep response resource-agnostic.

## Acceptance Criteria

- Existing booking returns `200`.
- Missing booking returns `404`.
- Response includes identifiers but not foreign service details.
- API authentication is enforced.

## Out Of Scope

Fetching linked user, organisation, payment, or resource data.
