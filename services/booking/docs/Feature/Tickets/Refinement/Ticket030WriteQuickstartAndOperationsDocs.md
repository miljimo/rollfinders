# 030 - Write Quickstart And Operations Docs

## Feature / Component

- Feature: Documentation
- Component: Developer docs
- Priority: P1
- Suggested owner: Technical Writer or Backend Engineer
- Branch name: `feature/booking-030-docs`
- Dependencies: Ticket002ContainerizeServiceAndComposeIntegration, Ticket004DefineOpenApiMvpContract

## Task

Write developer quickstart and operations documentation for the booking service.

## Implementation Notes

- Document local environment variables.
- Document Compose startup.
- Document migration flow.
- Document API examples for generic bookable resources.
- Document clear service boundaries and out-of-scope responsibilities.

## Acceptance Criteria

- A new developer can run the booking service locally from documentation alone.
- Docs explain that the service stores only IDs for users, organisations, resources, and payments.
- Docs include example requests for at least course session, appointment, and rental bookings.
- Troubleshooting section covers database and dependency failures.

## Out Of Scope

End-user product documentation.
