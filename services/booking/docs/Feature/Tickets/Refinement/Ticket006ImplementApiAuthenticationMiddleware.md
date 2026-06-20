# 006 - Implement API Authentication Middleware

## Feature / Component

- Feature: Security
- Component: API access control
- Priority: P0
- Suggested owner: Security-minded Backend Engineer
- Branch name: `feature/booking-006-api-auth`
- Dependencies: Ticket005ImplementSharedErrorAndRequestModel

## Task

Implement bearer-token authentication for service-to-service booking API access.

## Implementation Notes

- Use `Authorization: Bearer <token>`.
- Compare API keys without logging secrets.
- Support actor context headers for audit fields.
- Reject unauthenticated write and read endpoints by default.

## Acceptance Criteria

- Requests without valid credentials return `401`.
- Valid API credentials allow access to protected endpoints.
- Actor context is parsed and made available to handlers.
- Secrets are never logged.

## Out Of Scope

End-user OAuth sessions and browser authentication.
