# 005 - Create Academy Procedure First Migration Framework

## Feature / Component

- Feature: Academy Service
- Component: Database migration structure
- Priority: P0
- Branch: `feature/academy-db-migration-framework`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket 003
- Source PRD: `docs/services/academy/product.md`

## Task

Create the Academy Service SQL migration folder structure using the database-first pattern.

## Implementation Notes

- Create `apps/backend_api/migrations/academy`.
- Use subfolders for `schema`, `tables`, `types`, `functions`, and `procedures`.
- Keep one SQL file per table, function, or procedure.
- Use camelCase names for SQL functions/procedures and matching filenames.
- Add an initial core migration entrypoint that includes schema, types, tables, functions, and procedures in dependency order.
- Integrate Academy Service migrations into the existing local compose startup flow.

## Acceptance Criteria

- WHEN migrations run, THEN they create an `academy` schema in the shared RollFinders database.
- WHEN a reviewer inspects migration files, THEN functions and procedures are one per file.
- WHEN compose starts locally, THEN Academy Service migrations run without breaking other service migrations.

## Regression / Compatibility Tests

- Tina SHALL add migration smoke tests against an empty database.
- Tina SHALL confirm existing payments, booking, courses, users, and authorisation migrations still run.

## Out Of Scope

Actual academy tables and procedures beyond framework placeholders.
