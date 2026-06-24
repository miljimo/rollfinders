# 005 - Implement Catalogue Data Access Layer

## Feature / Component

- Feature: Subscription Service
- Component: Repository and data access
- Priority: P0
- Branch: `feature/subscription-catalogue-data-access`
- Developer owner: Developer sub-agent and DB sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket004CreateSubscriptionDatabaseSchema
- Source PRD: `docs/services/subscriptions/product.md`

## Task

Implement data access for products, product features, plans, and plan feature allowlists.

## Implementation Notes

- Follow existing service repository/data access conventions.
- Implement create, update, get, and list operations for products.
- Implement create, update, get, and list operations for product features.
- Implement create, update, get, and list operations for plans.
- Implement replace/list operations for plan feature allowlists.
- Enforce status filtering for active/inactive/retired records.
- Keep database writes procedure/function-backed where practical and consistent with nearby Go services.
- Return domain-specific errors for duplicate keys, unknown keys, inactive records, and invalid plan features.

## Acceptance Criteria

- WHEN a product is created, THEN its `service_key` is required.
- WHEN a feature is created, THEN its product must exist and be active.
- WHEN a plan feature allowlist is replaced, THEN every feature key must exist and be selectable.
- WHEN an inactive feature is submitted for a new plan allowlist, THEN the operation fails.
- WHEN a plan is fetched, THEN included features are returned explicitly.

## Regression / Compatibility Tests

- Add repository unit tests for validation failures.
- Add database integration tests behind an integration build tag if the repo uses live database tests.

## Out Of Scope

HTTP handlers and external service clients.
