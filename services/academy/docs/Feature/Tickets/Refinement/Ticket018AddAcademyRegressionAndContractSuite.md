# 018 - Add Academy Regression And Contract Suite

## Feature / Component

- Feature: Academy Service
- Component: Tests and release gates
- Priority: P0
- Branch: `feature/academy-regression-contract-suite`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Tickets 003-017 as applicable
- Source PRD: `services/academy/docs/product.md`

## Task

Create the Academy Service regression, contract, migration, and cutover test suite.

## Implementation Notes

- Add Go unit tests for validation, state transitions, endpoint handlers, and data access functions.
- Add SQL migration/procedure tests for empty DB and backfilled DB.
- Add OpenAPI contract tests for route/schema coverage.
- Add RollFinders integration tests for client behavior and UI compatibility.
- Add E2E tests covering public academy browsing, admin academy dashboard, profile editing, claims, verification, invitations, and membership mapping.
- Add negative tests proving academy membership does not contain role fields and is not used as the permission source.

## Acceptance Criteria

- WHEN CI runs, THEN Academy Service unit, integration, migration, and contract tests execute.
- WHEN local Docker is built, THEN app plus academy/users/authorisation/courses/booking/payments services start.
- WHEN regression tests pass, THEN existing RollFinders academy, course, booking, payment, user, and claim flows still work.

## Regression / Compatibility Tests

- Tina SHALL own the signoff checklist and add a `academyServiceTestPlan.md` file documenting pass/fail evidence.
- Tina SHALL include rollback notes for cutover tickets.

## Out Of Scope

Production deployment execution.
