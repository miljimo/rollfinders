# 021 - Implement User Service Validation Adapter

## Feature / Component

- Feature: Integrations
- Component: User Service
- Priority: P1
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-021-user-service-adapter`
- Dependencies: Ticket003DefineConfigurationAndEnvironmentContract

## Task

Create a User Service adapter for validating user identifiers when the caller requests validation.

## Implementation Notes

- Booking Service remains source of truth only for `user_id`.
- Validation should be optional/configurable per endpoint or request mode.
- Do not store returned user profile data.

## Acceptance Criteria

- Valid user IDs can be confirmed through User Service.
- User Service failures are handled with clear errors or fail-open/fail-closed behavior documented.
- No user PII is persisted in booking tables.

## Out Of Scope

Authentication and profile synchronization.
