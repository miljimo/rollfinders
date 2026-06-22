# 012 - Enforce Authorisation In Domain Services

## Feature / Component

- Feature: Service-to-service Authorisation
- Component: Academy, Courses, Booking, Payments, and Organisation service enforcement
- Priority: P2
- Branch: `feature/domain-services-authorisation-enforcement`
- Developer owner: Platform Backend Developer
- Test owner: Test Engineer
- Dependencies: Ticket007ImplementAuthorizeAndEffectivePermissionsApis, Ticket011ReplaceRollFindersHardcodedRoleGuards
- Source PRD: `services/authorisation/docs/product.md`

## Task

Update domain services so sensitive reads and mutations validate permissions through Authorisation Service.

## Implementation Notes

- Define actor context expected by each service.
- For each sensitive endpoint, identify required permission and scope.
- Add Authorisation Service client to each service using internal service auth.
- Prioritise:
  1. Academy Service lifecycle, claims, verification, and profile mutations.
  2. Courses Service create/update/delete.
  3. Booking Service cancellation/admin reads.
  4. Payments Service refunds, payout approvals, payout rejections, and payment operations.
  5. Organisation Service application and service enablement changes.
- Fail closed when Authorisation Service denies or required scope is missing.
- Preserve internal system operations through explicit service/system permissions.

## Acceptance Criteria

- WHEN a sensitive domain mutation is called without permission, THEN the service rejects it.
- WHEN actor has the required permission in scope, THEN the service permits the operation.
- WHEN Authorisation Service is unavailable for protected operations, THEN the service fails closed unless endpoint is explicitly system-internal.
- WHEN service logs are reviewed, THEN denied authorisation includes request id and permission code.

## Regression / Compatibility Tests

- Test Engineer SHALL add service integration tests for allow and deny paths.
- Test Engineer SHALL verify existing public read endpoints are not accidentally locked down unless intended.

## Out Of Scope

- RollFinders UI updates.
- Removing Users Service legacy authorisation data.
