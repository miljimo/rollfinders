# 022 - Implement Organisation Service Validation Adapter

## Feature / Component

- Feature: Integrations
- Component: Organisation Service
- Priority: P1
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-022-organisation-service-adapter`
- Dependencies: Ticket003DefineConfigurationAndEnvironmentContract

## Task

Create an Organisation Service adapter for validating `organisation_id` and optional membership context.

## Implementation Notes

- Booking Service stores only `organisation_id`.
- Keep validation generic and not academy-specific.
- Document behavior when Organisation Service is unavailable.

## Acceptance Criteria

- Valid organisation IDs can be confirmed through Organisation Service.
- Invalid organisation IDs are rejected when validation is requested.
- Organisation details are never persisted in bookings.

## Out Of Scope

Organisation management and membership editing.
