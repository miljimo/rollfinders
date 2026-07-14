# Name: Ticket017 - Audit and remove hard-coded permission gates

## Feature / Component

- Feature: Authorisation permission enforcement
- Component: Authorisation, Portal UI, API gateway, dashboard navigation
- Priority: P1
- Branch: `master`
- Developer owner: Agent
- Test owner: Agent
- Dependencies: Ticket016
- Source PRD: `apps/backend_api/internal/services/authorisation/docs/tickets/feature/Tickets/Refinement/Ticket016ReconcileAcademyWalletPermissionsAndScopedVisibility.md`

## Goal

Ensure permission-sensitive behaviour is driven by the authorisation permission check path instead of hand-coded role or UI permission logic.

## Scope

The agent must:
- Audit backend, portal server components, server actions, and dashboard navigation for hard-coded permission gates.
- Replace hand-coded permission gates with calls to the authorisation permission check path where the decision is about access to a capability, route, action, app, or service.
- Keep ownership and data visibility scoping separate from permission checks, but ensure scoped queries still apply after permission is granted.
- Add or update tests proving academy admins and owners see only authorised wallet UI/actions and only their scoped wallet records.
- Document any remaining role checks that are intentionally not permission checks, such as role labels, display copy, or non-security UI grouping.

The agent must not:
- Add new permissions without an explicit product decision or existing permission mapping.
- Move ownership filtering into the authorisation service.
- Treat client-side hiding as security enforcement.

## Implementation Notes

- Portal UI navigation must use effective permissions or `authorize(...)` results, not hard-coded role names, for app/service visibility.
- Server actions and route handlers must repeat permission checks server-side even if the UI hides the action.
- Role checks are allowed only for non-authorisation concerns or for deriving owner scope, such as determining whether an academy user should be limited to their own owner id.
- Super-admin bypasses must be represented through authorisation policy/effective permissions, not scattered UI exceptions.
- Existing data visibility rules still apply after permission approval; for example, academy admins may have `wallet.read` but must not see wallets belonging to other owners.

## Acceptance Criteria

- WHEN a portal navigation item is permission-sensitive, THEN it is shown or hidden using authorisation permission data rather than hard-coded role checks.
- WHEN an academy admin or academy owner has wallet permissions, THEN the Wallet app is visible and wallet actions are available only through checked permissions.
- WHEN an academy admin or academy owner opens Wallet, THEN the wallet list/search is scoped to their permitted owner context.
- WHEN a user lacks wallet permissions, THEN the Wallet app and wallet actions are hidden or rejected server-side.
- WHEN code contains a remaining role check, THEN it is either non-security display logic or explicitly documented as scope derivation.

## Regression / Compatibility Tests

- Confirm super admins can still access platform-wide wallet views where their permissions allow it.
- Confirm academy admins and owners can create/search/read their own wallets after permission reconciliation.
- Confirm members and unauthorised users cannot access wallet UI/actions.
- Confirm direct server action calls still enforce permission checks.
- Confirm existing dashboard panels still render for authorised users.

## Out Of Scope

- Redesigning the role model.
- Changing wallet ownership rules.
- Adding new wallet transaction or payout behaviour.
- Replacing the authorisation service contract.
