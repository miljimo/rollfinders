# 010 - Add RollFinders Authorisation Client And Compatibility Helper

## Feature / Component

- Feature: RollFinders Authorisation Migration
- Component: Next.js authorisation client/helper
- Priority: P1
- Status: Partially Implemented
- Branch: `feature/rollfinders-authorisation-helper`
- Developer owner: RollFinders Full Stack Developer
- Test owner: Test Engineer
- Dependencies: Ticket007ImplementAuthorizeAndEffectivePermissionsApis, Ticket009CutOverPermissionTablesToAuthorisationSourceOfTruth
- Source PRD: `apps/backend_api/internal/services/authorisation/docs/product.md`

## Task

Add a shared RollFinders authorisation client/helper that checks permissions and scope without requiring route handlers to inspect role names.

## Implementation Notes

- Add a server-only Authorisation Service client in RollFinders.
- Add shared helper shape equivalent to:
  - `authorize(actor, permission, scope)`
  - `requirePermission(actor, permission, scope)`
- Scope input must support:
  - `organisationId`
  - `applicationId`
  - `resourceType`
  - `resourceId`
- Helper SHALL treat Authorisation Service as the primary permission source after Ticket009 cutover.
- Helper MAY fall back to current Users Service compatibility data only behind an explicit migration flag before Ticket009 cutover.
- New code must call the helper instead of role-name guards.
- Add stable handling for deny, service unavailable, and missing application id.

## Acceptance Criteria

- WHEN a route needs authorisation, THEN it can call a permission-based helper with explicit scope.
- WHEN Authorisation Service returns deny, THEN the helper denies access.
- WHEN compatibility fallback is enabled, THEN current behaviour remains unchanged.
- WHEN new code is reviewed, THEN no new direct role-name checks are required.

## Regression / Compatibility Tests

- Test Engineer SHALL add unit/static tests proving the helper calls permission-based checks.
- Test Engineer SHALL verify existing admin access behaviour remains unchanged under compatibility fallback.

## Out Of Scope

- Replacing every existing guard.
- Removing `src/lib/admin.ts`.
