# 012 - Add Subscription Client And Gateway Route Contracts

## Feature / Component

- Feature: Subscription Service
- Component: Client and gateway route contracts
- Priority: P1
- Branch: `feature/subscription-client-gateway-contracts`
- Developer owner: Developer sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket010ImplementEntitlementEvaluationApis
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Task

Add server-side Subscription Service client contracts and API gateway route registration without connecting existing RollFinders feature flows to Subscription Service.

## Implementation Notes

- Add a server-side Subscription Service client following existing service-client patterns.
- Add client methods for available product features, plans, subscriptions, and entitlements.
- Add Subscription Service routes to the API gateway route registry following the same structure as existing protected services.
- Attach Authorisation Service permission metadata to every registered Subscription Service business route.
- Add or reconcile Subscription Service permission definitions in the Authorisation Service catalog before enabling gateway routes.
- Keep route registration and client methods unused by existing dashboard panels until a separate integration ticket is approved.
- Keep Authorisation Service as the user/resource access decision authority.
- Ensure consumers treat missing entitlement features as unavailable.
- Do not call Subscription Service directly from browser code unless routed through approved API/gateway surfaces.
- Do not add subscription checks to Academies, Courses/Events, Bookings, Payments, Manage Users, Analytics, Academy Review, or Academy Claims flows in this ticket.

## Acceptance Criteria

- WHEN a server-side client calls the entitlement endpoint in isolation, THEN it can determine whether a feature key is active.
- WHEN an entitlement feature is absent, THEN the client helper reports the commercial capability as unavailable.
- WHEN existing RollFinders feature flows run, THEN their behavior is unchanged by this ticket.
- WHEN a caller lacks the required subscription permission, THEN the gateway denies the request before Subscription Service is called.
- WHEN a route is registered in the gateway, THEN only `GET /healthz` and `GET /readyz` are public.
- WHEN subscription routes are enabled, THEN their permission codes exist in Authorisation Service.

## Regression / Compatibility Tests

- Add service-client contract tests.
- Add gateway tests for subscription route permission allow/deny behavior.
- Add gateway route registry tests proving every Subscription Service business route has permission metadata.
- Add permission catalog reconciliation tests for `subscription.*` permission definitions.
- Add static tests to prevent browser-only code from calling internal Subscription Service URLs directly if similar tests exist for other services.
- Add static tests or review evidence proving existing dashboard panel routes are not modified by this ticket.

## Out Of Scope

Existing dashboard integration, product feature cutover, and full admin plan-management UI.
