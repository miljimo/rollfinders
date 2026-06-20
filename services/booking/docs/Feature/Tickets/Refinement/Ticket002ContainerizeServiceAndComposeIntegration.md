# 002 - Containerize Service And Compose Integration

## Feature / Component

- Feature: Platform Foundation
- Component: Container runtime
- Priority: P0
- Suggested owner: Platform Engineer
- Branch name: `feature/booking-002-container-compose`
- Dependencies: Ticket001BootstrapGoApiService

## Task

Containerize the booking service and add it to local Compose so it can run beside RollFinders, User Service, Organisation Service, Payment Service, and PostgreSQL.

## Implementation Notes

- Add `services/booking/Dockerfile`.
- Add `services/booking/compose.yml`.
- Include booking service from root `compose.yml` only when appropriate.
- Use the same database server as local platform services, with its own schema if needed.
- Default public local port should be documented and avoid collisions.

## Acceptance Criteria

- WHEN `docker compose` runs with the booking profile, THEN booking service starts.
- WHEN booking starts in Compose, THEN it can reach PostgreSQL.
- WHEN `GET /healthz` is called through the mapped local port, THEN it returns `200`.
- IF required environment variables are missing, THEN startup fails clearly.

## Out Of Scope

Production deployment and CI.
