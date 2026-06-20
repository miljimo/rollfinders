# 016 - Implement List Bookings Endpoint

## Feature / Component

- Feature: Booking APIs
- Component: `GET /v1/bookings`
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-016-list-bookings`
- Dependencies: Ticket009ImplementDataAccessFunctions

## Task

Implement scoped booking search/list endpoint.

## Implementation Notes

- Support filters for `customer_id`, `organisation_id`, `bookable_type`, `bookable_id`, `bookable_instance_id`, `status`, `payment_id`, and time range.
- Add pagination.
- Define stable ordering.

## Acceptance Criteria

- Filtered requests return only matching bookings.
- Pagination metadata is returned.
- Unbounded result sets are not allowed.
- Invalid filters return validation errors.

## Out Of Scope

Full text search and analytics aggregation.
