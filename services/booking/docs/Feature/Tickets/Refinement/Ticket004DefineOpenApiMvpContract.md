# 004 - Define OpenAPI MVP Contract

## Feature / Component

- Feature: API Contract
- Component: OpenAPI
- Priority: P0
- Suggested owner: API Designer
- Branch name: `feature/booking-004-openapi-contract`
- Dependencies: Ticket003DefineConfigurationAndEnvironmentContract

## Task

Create the OpenAPI contract for the generic booking service MVP.

## Implementation Notes

- Add `services/booking/docs/api/OpenApi.yaml`.
- Define booking, participant, status-history, error, and pagination schemas.
- Keep API names resource-agnostic.
- Include request examples for course sessions, appointments, hotel rooms, and rentals.

## Acceptance Criteria

- OpenAPI defines create, get, list, cancel, confirm, complete, participant, and attendance endpoints.
- Request schemas include `bookable_type`, `bookable_id`, and optional `bookable_instance_id`.
- Response schemas do not contain user profile, organisation details, resource details, or payment transaction details.
- Error responses use one shared error envelope.

## Out Of Scope

Generated SDKs.
