# 007 - Implement Product And Feature Catalogue APIs

## Feature / Component

- Feature: Subscription Service
- Component: Product and feature HTTP APIs
- Priority: P0
- Branch: `feature/subscription-product-feature-apis`
- Developer owner: Developer sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket006ImplementAvailableServiceLoading
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Task

Implement APIs for platform admins to create and manage products and product features.

## Implementation Notes

- Implement product routes from the OpenAPI contract.
- Implement product feature routes from the OpenAPI contract.
- Implement `GET /v1/applications/{application_id}/available-product-features`.
- Validate product `service_key`.
- Validate feature `product_key`.
- Support feature status transitions without deleting historical plan references.
- Support `plan_selectable` on products and features.
- Preserve stable keys; key changes should require creating a new product/feature unless an explicit admin migration flow is later approved.
- Do not expose permission assignment writes.

## Acceptance Criteria

- WHEN a platform admin creates a product, THEN it can be listed and fetched by key.
- WHEN a platform admin creates a product feature, THEN it is linked to an active product.
- WHEN a product is inactive, THEN its features are not available for new plans.
- WHEN a feature is retired, THEN it is not selectable for new plans.
- WHEN available features are requested, THEN the response respects service availability or bootstrap fallback rules.

## Regression / Compatibility Tests

- Add handler tests for create/list/get/update product routes.
- Add handler tests for create/list/get/update feature routes.
- Add authorization boundary tests if gateway enforcement is included at this stage.

## Out Of Scope

Plan creation and customer subscriptions.
