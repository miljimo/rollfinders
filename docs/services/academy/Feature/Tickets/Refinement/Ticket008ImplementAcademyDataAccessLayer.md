# 008 - Implement Academy Data Access Layer

## Feature / Component

- Feature: Academy Service
- Component: Go data access functions
- Priority: P0
- Branch: `feature/academy-dataaccess`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket 007
- Source PRD: `docs/services/academy/product.md`

## Task

Implement the Academy Service data access layer around stored procedures/functions.

## Implementation Notes

- Use `internal/dataaccess` package.
- Prefer package-level functions instead of large store structs, following the latest payment service direction.
- Use the internal database wrapper package for connection handling.
- Each data access function should call one stored procedure/function.
- Keep file names CamelCase and focused by operation group.
- Return typed domain structs and stable errors.

## Acceptance Criteria

- WHEN handlers need data, THEN they call `dataaccess` functions, not raw SQL directly.
- WHEN tests mock or exercise data access, THEN procedure/function names are clear and traceable.
- WHEN code is reviewed, THEN package name is `dataaccess`.

## Regression / Compatibility Tests

- Tina SHALL add integration tests for data access functions against local Postgres.
- Tina SHALL confirm no endpoint bypasses the database-first access layer.

## Out Of Scope

HTTP endpoint implementation.
