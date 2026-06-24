# 002 - Containerize Service And Local Compose

## Feature / Component

- Feature: Platform Foundation
- Component: Container runtime
- Priority: P0
- Suggested owner: Platform Engineer
- Dependencies: Ticket001BootstrapGoApiService

## Task

Package the stateless Go service as a container and provide local Docker Compose with PostgreSQL.

## Implementation Notes

- Create a production-oriented Dockerfile.
- Add local compose for API plus PostgreSQL.
- Use environment variables and volumes, not host-specific absolute paths.

## Acceptance Criteria

- WHEN `docker compose up` runs, THEN PostgreSQL and the API start successfully.
- WHEN the API container starts, THEN it uses environment-based configuration only.
- IF no host-specific paths are configured, THEN the local stack still runs.
- WHEN containers restart, THEN database data persists through a Docker volume.
- WHEN the image is run on another container platform, THEN no code changes are required.

## Out Of Scope

Kubernetes manifests, Helm charts, managed hosting, production secrets provisioning.
