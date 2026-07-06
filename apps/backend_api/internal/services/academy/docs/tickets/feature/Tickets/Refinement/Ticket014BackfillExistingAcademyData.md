# 014 - Backfill Existing Academy Data

## Feature / Component

- Feature: Academy Service
- Component: Data migration/backfill
- Priority: P0
- Branch: `feature/academy-data-backfill`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Tickets 006, 007
- Source PRD: `apps/backend_api/internal/services/academy/docs/product.md`

## Task

Backfill existing RollFinders academy-domain data into the Academy Service schema.

## Implementation Notes

- Backfill existing public/Prisma academy data while preserving academy IDs.
- Backfill academy profile fields, social links, claims, invitations, claim reminders, and academy/user mappings.
- Do not backfill users, courses, bookings, payments, payment account settings, roles, or permissions into Academy Service.
- Convert existing academy membership rows into mapping rows only.
- Create or verify corresponding Authorisation Service assignments for academy admins/owners based on current role source of truth.
- Produce a repeatable script and migration report.

## Acceptance Criteria

- WHEN backfill runs, THEN existing academy IDs remain unchanged.
- WHEN backfill completes, THEN row counts and sampled records match legacy data.
- WHEN membership mappings are inspected, THEN no role/admin/owner field is present.
- WHEN authorisation assignments are inspected, THEN academy admins/owners retain access.

## Regression / Compatibility Tests

- Tina SHALL run backfill against a copy of local/dev data and record before/after counts.
- Tina SHALL test academy dashboard, public academy pages, claims, invitations, courses, bookings, and payments after backfill.

## Out Of Scope

Deleting legacy tables.
