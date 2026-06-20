# 029 - Create CI Pipeline

## Feature / Component

- Feature: Delivery
- Component: CI
- Priority: P1
- Suggested owner: Platform Engineer
- Branch name: `feature/booking-029-ci-pipeline`
- Dependencies: Ticket027AddDomainUnitTests, Ticket028AddApiIntegrationAndContractTests

## Task

Add CI coverage for booking service build, tests, linting, and container build.

## Implementation Notes

- Reuse repository CI conventions.
- Include `go test ./...`.
- Include Docker build validation.
- Include OpenAPI validation if tooling exists or is added.

## Acceptance Criteria

- CI fails on compile errors.
- CI fails on test failures.
- CI validates the booking Docker image builds.
- CI command documentation is added.

## Out Of Scope

Production deployment.
