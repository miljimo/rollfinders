# 011 - Replace RollFinders Hardcoded Role Guards

## Feature / Component

- Feature: RollFinders Authorisation Migration
- Component: Route, action, and dashboard guard replacement
- Priority: P1
- Status: Partially Implemented
- Branch: `feature/rollfinders-permission-first-guards`
- Developer owner: RollFinders Full Stack Developer
- Test owner: Test Engineer
- Dependencies: Ticket010AddRollFindersAuthorisationClientAndCompatibilityHelper
- Source PRD: `apps/backend_api/internal/services/authorisation/docs/product.md`

## Task

Replace hardcoded role guards in RollFinders with permission-first authorisation checks.

## Implementation Notes

- Replace guards incrementally in this order:
  1. academy management
  2. academy claims
  3. course management
  4. booking management
  5. payment refund and payout actions
  6. user administration
  7. organisation/application administration
- Replace direct checks such as:
  - `isSuperAdminRole`
  - `isPlatformAdminRole`
  - `isAcademyAdminRole`
  - role string comparisons
- Keep compatibility helpers only where behaviour has not yet moved to permissions.
- Preserve existing access outcomes during migration.
- Add permission constants or a typed permission catalog if useful for preventing typos.

## Acceptance Criteria

- WHEN academy management routes are reviewed, THEN access is permission-based.
- WHEN course, booking, and payment actions are reviewed, THEN sensitive mutations use permission checks.
- WHEN user administration is reviewed, THEN target-user restrictions are represented through permissions and delegation rules.
- WHEN existing tests run, THEN current allowed and denied user flows still behave correctly.

## Regression / Compatibility Tests

- Test Engineer SHALL run existing admin, dashboard, academy, course, booking, and payment tests.
- Test Engineer SHALL add targeted tests for permission deny scenarios.
- Test Engineer SHALL add static checks preventing new hardcoded role guards in migrated areas.

## Out Of Scope

- Domain service enforcement.
- Removing legacy compatibility code globally.
