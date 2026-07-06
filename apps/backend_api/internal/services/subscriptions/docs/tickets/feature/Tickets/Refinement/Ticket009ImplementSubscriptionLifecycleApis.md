# 009 - Implement Subscription Lifecycle APIs

## Feature / Component

- Feature: Subscription Service
- Component: Organisation subscription lifecycle
- Priority: P1
- Branch: `feature/subscription-lifecycle-apis`
- Developer owner: Developer sub-agent and DB sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket008ImplementPlanCatalogueAndFeatureRules
- Source PRD: `apps/backend_api/internal/services/subscriptions/docs/product.md`

## Task

Implement APIs to create and manage subscriptions for an organisation application.

## Implementation Notes

- Implement subscription lifecycle routes from the OpenAPI contract.
- Store organisation and application identifiers as external text IDs.
- Use `application_id` as the canonical route scope for subscription creation and listing.
- Resolve or validate the owning `organisation_id` from Organisation Service for the supplied `application_id`.
- Support statuses for trial, active, past due, cancelled, expired, and suspended where required by the PRD.
- Allow one active subscription per organisation/application unless the PRD is later expanded for multiple concurrent subscriptions.
- Support cancellation at period end.
- Support immediate cancellation only as an explicit admin operation.
- Store billing period start/end and trial start/end where applicable.
- Add audit events for subscription mutations.

## Acceptance Criteria

- WHEN a subscription is created for an active plan, THEN it is associated with organisation, application, plan, status, and billing period.
- WHEN a subscription is created through `POST /v1/applications/{application_id}/subscriptions`, THEN the service stores both `application_id` and its owning `organisation_id`.
- WHEN a plan is inactive, THEN new subscriptions cannot be created on it.
- WHEN a subscription is cancelled at period end, THEN current entitlements remain active until period end.
- WHEN a subscription is expired or cancelled, THEN active entitlements are no longer published.
- WHEN duplicate active subscriptions are attempted for the same organisation/application, THEN the service rejects the request.

## Regression / Compatibility Tests

- Add lifecycle handler tests for create, fetch, list, cancel, and duplicate-active rules.
- Add status transition tests.

## Out Of Scope

Payment provider integration and entitlement API implementation.
