# 017 - Cut Over RollFinders Academy Write Paths

## Feature / Component

- Feature: Academy Service
- Component: RollFinders write integration
- Priority: P1
- Branch: `feature/academy-write-path-cutover`
- Developer owner: RollFinders Frontend/Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket 016
- Source PRD: `services/academy/docs/product.md`

## Task

Move RollFinders academy mutations from Prisma/public tables to Academy Service APIs.

## Implementation Notes

- Cut over academy create/update/archive/publish/unpublish/suspend/restore.
- Cut over profile, location, contact, media, and social link updates.
- Cut over claim approval/rejection/cancel flows.
- Cut over verification approval/rejection flows.
- Cut over invitation create/accept/cancel/resend flows.
- Cut over membership mapping add/remove.
- Ensure role/permission changes happen through Authorisation Service, not membership tables.

## Acceptance Criteria

- WHEN an academy mutation succeeds, THEN the Academy Service schema is the source of truth.
- WHEN a claim/invitation grants access, THEN Authorisation Service stores the scoped role/permission assignment.
- WHEN membership mapping is written, THEN only academy/user mapping data is persisted.

## Regression / Compatibility Tests

- Tina SHALL run E2E tests for academy creation, edit, claim approval, verification, invitation acceptance, member removal, and dashboard access.
- Tina SHALL confirm existing course, booking, and payment flows still work after academy write cutover.

## Out Of Scope

Deleting legacy public academy tables.
