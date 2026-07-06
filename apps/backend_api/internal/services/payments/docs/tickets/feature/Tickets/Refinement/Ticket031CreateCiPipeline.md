# 031 - Create CI Pipeline

## Feature / Component

- Feature: Delivery
- Component: CI
- Priority: P1
- Suggested owner: DevOps Engineer
- Dependencies: Ticket002ContainerizeServiceAndLocalCompose, Ticket028AddDomainUnitTests

## Task

Add CI checks for formatting, static checks, tests, OpenAPI validation, and Docker image build.

## Implementation Notes

- CI should be useful for both human engineers and AI agents.
- Provision PostgreSQL for integration tests when those tests are enabled.

## Acceptance Criteria

- WHEN a pull request is opened, THEN CI runs Go formatting checks and tests.
- WHEN code is not formatted, THEN CI fails.
- WHEN the Docker image build fails, THEN CI fails.
- IF PostgreSQL integration tests are enabled, THEN CI provisions PostgreSQL.
- WHEN OpenAPI validation fails, THEN CI fails.

## Out Of Scope

Production deployment pipeline and release automation.
