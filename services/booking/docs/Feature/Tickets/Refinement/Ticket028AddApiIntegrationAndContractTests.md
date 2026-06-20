# 028 - Add API Integration And Contract Tests

## Feature / Component

- Feature: Quality
- Component: API tests
- Priority: P1
- Suggested owner: Test Engineer
- Branch name: `feature/booking-028-api-integration-tests`
- Dependencies: Ticket014ImplementCreateBookingEndpoint, Ticket015ImplementGetBookingEndpoint, Ticket016ImplementListBookingsEndpoint, Ticket017ImplementCancelBookingEndpoint

## Task

Add API integration and contract tests for the booking service.

## Implementation Notes

- Use local PostgreSQL test database or containerized test setup.
- Cover authentication, validation, success, not found, and invalid transition cases.
- Compare implemented handlers against OpenAPI examples where practical.

## Acceptance Criteria

- Create/get/list/cancel tests pass.
- Unauthenticated requests fail.
- Invalid request bodies fail with shared error model.
- Tests can run in CI without external User, Organisation, or Payment services unless explicitly mocked.

## Out Of Scope

Browser end-to-end tests.
