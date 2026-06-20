# 003 - Define Configuration And Environment Contract

## Feature / Component

- Feature: Platform Foundation
- Component: Configuration
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-003-configuration-contract`
- Dependencies: Ticket001BootstrapGoApiService

## Task

Define all environment variables required by the booking service and implement typed configuration loading.

## Implementation Notes

- Include DB host, port, name, user, password.
- Include API key configuration for service-to-service callers.
- Include User Service, Organisation Service, and Payment Service base URLs and API keys.
- Include read/write timeout and shutdown timeout values.
- Do not use connection strings when separate DB variables are available.

## Acceptance Criteria

- WHEN configuration loads, THEN each variable has validation and safe defaults only for local development.
- IF a required production variable is missing, THEN the service fails before accepting traffic.
- WHEN configuration is logged, THEN secrets are redacted.

## Out Of Scope

Secret rotation and external secret stores.
