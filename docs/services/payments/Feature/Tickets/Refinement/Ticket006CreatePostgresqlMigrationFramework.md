# 006 - Create PostgreSQL Migration Framework

## Feature / Component

- Feature: Persistence
- Component: Database migrations
- Priority: P0
- Suggested owner: Backend Engineer
- Dependencies: Ticket001BootstrapGoApiService, Ticket002ContainerizeServiceAndLocalCompose

## Task

Add migration tooling and schema version tracking for PostgreSQL.

## Implementation Notes

- Use repeatable, deterministic migrations.
- Make local compose able to initialize a fresh database.
- Fail startup or migration command clearly when migration fails.

## Acceptance Criteria

- WHEN migrations run on a clean database, THEN the schema version table is created.
- WHEN migrations run twice, THEN the second run is a no-op.
- IF a migration fails, THEN the failure is reported with an actionable error.
- WHEN local compose starts from a fresh database, THEN schema setup is documented or automatic.
- IF database credentials are missing, THEN migration startup fails safely.

## Out Of Scope

Payment tables beyond the migration framework.
