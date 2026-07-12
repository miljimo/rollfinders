# Name: 015 - Add Academy Wallet Wildcard Permissions

## Feature / Component

- Feature: Authorisation default role permissions
- Component: Authorisation Service configuration
- Priority: P1
- Branch: `master`
- Developer owner: Agent
- Test owner: Agent
- Dependencies: None
- Source PRD: `apps/backend_api/internal/services/authorisation/config/permissions.json`

## Goal

Grant academy admin roles wallet read and write access through the editable default role permission configuration.

## Scope

The agent must:
- Add `wallet.*` to `ACADEMY_ADMIN`.
- Add `wallet.*` to `ACADEMY_OWNER`.
- Keep `MEMBER` as the default non-admin role without wallet access.

The agent must not:
- Grant wallet access to `MEMBER`.
- Reintroduce `STANDARD_USER` as an active default role.
- Change wallet service ownership or route-level scope enforcement.

## Implementation Notes

- `wallet.*` means every permission code beginning with `wallet.`.
- Academy wallet access must still be constrained by route/resource scope.
- `SUPER_ADMIN` remains configured with full wildcard permissions.

## Acceptance Criteria

- WHEN default role permissions are loaded, THEN `ACADEMY_ADMIN` includes `wallet.*`.
- WHEN default role permissions are loaded, THEN `ACADEMY_OWNER` includes `wallet.*`.
- WHEN default role permissions are loaded, THEN `MEMBER` has baseline authenticated permissions but no wallet wildcard.

## Regression / Compatibility Tests

- Confirm `permissions.json` remains valid JSON.
- Confirm `MEMBER` keeps `account.read`, `auth.session.read`, and basic course/booking permissions.
- Confirm only academy admin roles receive `wallet.*`.

## Out Of Scope

- Wallet UI changes.
- Payment dashboard changes.
- Database migrations for legacy role enum cleanup.
