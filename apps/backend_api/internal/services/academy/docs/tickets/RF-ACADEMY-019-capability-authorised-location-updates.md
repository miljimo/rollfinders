# Name: RF-ACADEMY-019 - Capability-Authorised Academy Location Updates

## Feature / Component

- Feature: Academy location and coordinate management
- Component: Academy service, Authorisation service, API gateway, admin academy editor
- Priority: P0
- Branch: `fix/academy-location-update-authorisation`
- Developer owner: Platform team
- Test owner: Platform team
- Dependencies: None
- Source PRD: `apps/backend_api/internal/services/academy/docs/product.md`

## Goal

Allow authorised administrators, including Super Admins, to resolve and update academy addresses and coordinates through capability-based authorisation without hard-coded role checks.

## Scope

The agent must:

- Replace the `/api/admin/geocode` dependency on the unrelated `users.admin.access` capability with the academy location-management permission contract.
- Authorise academy location writes through the canonical `academy.update` capability and the target academy resource scope.
- Ensure the Super Admin wildcard grants coordinate lookup and academy location update access.
- Keep Academy Admin and Academy Owner access constrained to academies within their authorised organisation or academy scope.
- Keep address, city, postcode, borough, country, latitude, and longitude updates in the Academy service write path.
- Return a specific authorisation error to the editor when access is denied and a separate lookup error when geocoding fails.
- Preserve manually entered valid coordinates when geocoding is unavailable.
- Record the acting user and changed location fields through the existing academy audit mechanism.

The agent must not:

- Hard-code role names such as `SUPER_ADMIN`, `PLATFORM_ADMIN`, `ACADEMY_ADMIN`, or `ACADEMY_OWNER` in the geocoding or academy update route.
- Use `users.admin.access` as a proxy for academy-management permission.
- Allow academy-scoped administrators to update academies outside their authorised scope.
- Move geocoding or academy location ownership into the Users service.
- Silently replace existing coordinates when a lookup fails.

## Implementation Notes

- Authenticate the caller first, then evaluate `academy.update` through the Authorisation service.
- For an existing academy, pass the academy resource ID and organisation/application scope into the authorisation decision.
- For a new academy workflow, use the existing academy-create capability until the Academy service returns the created resource ID.
- Treat the Super Admin wildcard in the Authorisation service as the source of elevated access; the portal must consume the decision rather than infer it from a role string.
- Keep `/api/public/geocode` separate from authenticated academy-management authorization.
- Do not accept a client-provided actor, role, privilege list, academy scope, or organisation scope as authoritative.

## Acceptance Criteria

- WHEN a Super Admin selects **Find coordinates** while editing any academy, THEN coordinate lookup succeeds without an `Admin access required` response.
- WHEN a Super Admin saves corrected latitude and longitude values, THEN the Academy service persists the values and the public academy location uses them.
- WHEN an authorised academy-scoped administrator edits an academy in scope, THEN coordinate lookup and location update are allowed.
- WHEN an academy-scoped administrator targets an academy outside their scope, THEN lookup or update is denied without exposing or changing that academy.
- WHEN a caller lacks `academy.update`, THEN the location editor does not permit the update and the API returns `403`.
- WHEN geocoding returns no result, THEN existing or manually entered coordinates remain unchanged and the editor shows a lookup-specific message.
- WHEN location values are changed, THEN the academy audit record identifies the actor and changed fields.

## Regression / Compatibility Tests

- Confirm Super Admin wildcard authorisation covers `academy.update` without portal role checks.
- Confirm Platform Admin behavior follows assigned capabilities and scopes.
- Confirm Academy Admin and Academy Owner resource scoping remains enforced.
- Confirm `/api/public/geocode` remains usable by the public academy-registration workflow.
- Confirm academy create and edit forms still validate latitude and longitude numerically.
- Confirm academy profile, map, and public discovery read the updated Academy service coordinates.
- Confirm geocoding failure does not clear previously stored coordinates.

## Out Of Scope

- Replacing the geocoding provider.
- Bulk correction of existing academy coordinates.
- Changes to public academy search ranking or distance calculations.
- New roles, role-specific bypasses, or a second permission model.
