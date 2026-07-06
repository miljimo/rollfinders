# 008 - Implement Plan Catalogue And Feature Rules

## Feature / Component

- Feature: Subscription Service
- Component: Plan catalogue and feature allowlists
- Priority: P0
- Branch: `feature/subscription-plan-feature-rules`
- Developer owner: Developer sub-agent and DB sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket007ImplementProductAndFeatureCatalogueApis
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Task

Implement plan creation and plan feature allowlist rules.

## Implementation Notes

- Implement plan routes from the OpenAPI contract.
- Store every included feature explicitly in `plan_features`.
- Treat every feature not listed on the plan as unavailable.
- Validate that submitted feature keys exist, are active, and are plan-selectable.
- Validate that submitted feature products are available for the target application when application context is supplied.
- Support optional quota/limit values per plan feature.
- Do not infer all product features when a plan includes a product.
- Add audit events for plan creation and plan-feature changes.

## Acceptance Criteria

- WHEN a plan is created with known active features, THEN the plan is saved with an explicit feature allowlist.
- WHEN a plan is created with an unknown feature key, THEN the request fails.
- WHEN a plan is created with an inactive or retired feature, THEN the request fails.
- WHEN a product contains multiple features, THEN only explicitly listed features are granted by the plan.
- WHEN a plan is fetched, THEN unavailable features are absent from the grant list.

## Regression / Compatibility Tests

- Add tests for unknown, inactive, disabled-service, and duplicate feature keys.
- Add tests that missing features are denied by default.
- Add tests for plan limit metadata persistence.

## Out Of Scope

Activating customer subscriptions.
