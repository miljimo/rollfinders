# 006 - Implement Academy Core Schema

## Feature / Component

- Feature: Academy Service
- Component: Database tables and types
- Priority: P0
- Branch: `feature/academy-core-schema`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Tickets 001, 005
- Source PRD: `docs/services/academy/product.md`

## Task

Implement the Academy Service schema tables and indexes.

## Implementation Notes

- Create tables for academies, academy profiles, social links, membership mappings, claims, verifications, invitations, claim reminders, settings, and audit/outbox if required.
- Store external references as text IDs only. Do not add cross-service foreign keys to users, organisations, courses, bookings, or payments.
- Academy membership mapping must include `academy_id`, `user_id`, optional status, and timestamps. It must not include role/admin/owner fields.
- Use status/type constraints or enum-like checks where useful.
- Add unique constraints for academy slug, academy/user mapping, social platform per academy, and invitation tokens.
- Add indexes for list/search patterns in the PRD.

## Acceptance Criteria

- WHEN migrations run, THEN all v1 Academy Service tables exist under `academy`.
- WHEN table definitions are reviewed, THEN `academy_members` has no role column.
- WHEN existing academy IDs are backfilled later, THEN schema supports stable ID preservation.

## Regression / Compatibility Tests

- Tina SHALL add schema contract checks for required tables/indexes.
- Tina SHALL add a negative schema check that fails if membership roles are reintroduced.

## Out Of Scope

Stored procedures and API handlers.
