# 006 - Implement Available Service Loading

## Feature / Component

- Feature: Subscription Service
- Component: Organisation and Authorisation catalogue integration
- Priority: P0
- Branch: `feature/subscription-available-service-loading`
- Developer owner: Developer sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket005ImplementCatalogueDataAccessLayer
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Task

Implement available product-feature loading for plan creation.

## Implementation Notes

- Add an Organisation Service client for `GET /v1/applications/{application_id}/services`.
- Filter Subscription Service products by enabled Organisation Service `service_key`.
- Return only active, plan-selectable product features for enabled products.
- Add bootstrap fallback when Organisation Service service availability is unavailable because the endpoint/table/service is not ready.
- In bootstrap fallback, call Authorisation Service to list permission definitions.
- Group permissions by prefix into suggested draft product areas.
- Expose bootstrap results as candidates only, not as granted customer entitlements.
- Include response metadata that says whether the result came from Organisation Service or bootstrap fallback.
- Prefer Organisation Service whenever it responds successfully.

## Acceptance Criteria

- WHEN Organisation Service returns enabled `booking`, THEN booking products/features can appear in available features.
- WHEN Organisation Service returns disabled `analytics`, THEN analytics products/features do not appear.
- WHEN Organisation Service service availability is unavailable during bootstrap, THEN permission catalogue candidates are returned.
- WHEN fallback candidates are returned, THEN they are marked as draft/candidate data and not active entitlements.
- WHEN Organisation Service recovers, THEN Subscription Service uses Organisation Service instead of fallback.

## Regression / Compatibility Tests

- Add tests for enabled, disabled, unavailable, and partially unavailable Organisation Service responses.
- Add tests that fallback does not grant all permissions as customer features.
- Add tests for permission prefix grouping.

## Out Of Scope

Plan creation and subscription entitlement publication.
