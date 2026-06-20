# 007 - Create Database Migration Framework

## Feature / Component

- Feature: Persistence
- Component: Database migrations
- Priority: P0
- Suggested owner: Database Engineer
- Branch name: `feature/booking-007-migration-framework`
- Dependencies: Ticket003DefineConfigurationAndEnvironmentContract

## Task

Create the booking service database migration structure.

## Implementation Notes

- Follow the database-first style used by platform services.
- Split schema, tables, functions, procedures, and types into separate folders when practical.
- Migrations must be deterministic and safe to run in local Compose.
- Prefer PostgreSQL stored functions/procedures for data mutations and reads when implementing persistence.

## Acceptance Criteria

- Migration files exist under `services/booking/migrations`.
- Local Compose applies migrations automatically or documents the explicit command.
- Migration names are ordered and repeatable.
- Rollback policy is documented.

## Out Of Scope

All core booking tables, except minimal migration metadata if required.
