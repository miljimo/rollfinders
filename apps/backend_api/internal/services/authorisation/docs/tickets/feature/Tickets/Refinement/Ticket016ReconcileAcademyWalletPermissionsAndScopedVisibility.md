# Name: 016 - Reconcile Academy Wallet Permissions And Scoped Visibility

## Feature / Component

- Feature: Academy wallet service access
- Component: Authorisation Service database seed and Portal wallet dashboard
- Priority: P1
- Branch: `master`
- Developer owner: Agent
- Test owner: Agent
- Dependencies: Ticket015AddAcademyWalletWildcardPermissions
- Source PRD: `apps/backend_api/internal/services/authorisation/config/permissions.json`

## Goal

Ensure academy admins and academy owners can see the wallet service, create/search/read their own wallets, and cannot see other owners' wallets from the dashboard.

## Scope

The agent must:
- Reconcile the authorisation database so `ACADEMY_ADMIN` and `ACADEMY_OWNER` receive wallet role permissions.
- Keep `MEMBER` without wallet permissions.
- Keep wallet dashboard queries scoped to the current academy user's own wallet owner id.
- Keep existing user permission and visibility rules in place.
- Add or update regression tests for academy wallet role permissions.

The agent must not:
- Give academy roles platform-wide wallet visibility.
- Grant wallet permissions to `MEMBER`.
- Change Wallet Service ledger ownership or wallet transaction rules.
- Replace route-level authorisation with UI-only checks.

## Implementation Notes

- `permissions.json` is the editable default role map, but deployed databases need a migration/reconciliation step.
- Academy roles may use `wallet.*` in configuration, while SQL role permissions must resolve to concrete wallet permission rows.
- Portal filtering is a UI-level guard; backend/gateway ownership enforcement remains authoritative.

## Acceptance Criteria

- WHEN an academy admin or owner logs in, THEN the wallet app is visible if their effective permissions include wallet access.
- WHEN an academy admin or owner opens the wallet dashboard, THEN only wallets owned by their user id are requested and displayed.
- WHEN an academy admin or owner creates a wallet, THEN the selected owner defaults to themselves and duplicate wallet rules still apply.
- WHEN `MEMBER` logs in, THEN wallet service access is not granted by the default role.

## Regression / Compatibility Tests

- Confirm `permissions.json` parses and academy roles resolve wallet wildcard permissions.
- Confirm the authorisation seed/migration contains concrete academy wallet permission reconciliation.
- Confirm platform and super admins retain broader wallet operational visibility.
- Confirm wallet service duplicate protection is unchanged.

## Out Of Scope

- Wallet transaction transfer policy changes.
- Payment dashboard redesign.
- External wallet provider onboarding flow.
