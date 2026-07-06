# 004 - Define Academy OpenAPI Contract

## Feature / Component

- Feature: Academy Service
- Component: OpenAPI contract
- Priority: P0
- Branch: `feature/academy-openapi-contract`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Tickets 001, 002
- Source PRD: `apps/backend_api/internal/services/academy/docs/product.md`

## Task

Create the `/v1` Academy Service OpenAPI contract.

## Implementation Notes

- Add `apps/backend_api/internal/services/academy/docs/api/openApi.yaml`.
- Define routes from the PRD route permission matrix.
- Include request/response schemas for academies, profiles, social links, claims, verifications, invitations, membership mappings, reminders, analytics summaries, audit events, and payment capability summaries.
- Model academy membership as a mapping with `id`, `academy_id`, `user_id`, `status`, and timestamps only. Do not include role fields.
- Include stable error envelopes, validation errors, pagination, filters, and request IDs.
- Include permission metadata in operation descriptions.

## Acceptance Criteria

- WHEN the OpenAPI file is linted, THEN it is valid YAML and all routes are under `/v1`.
- WHEN a developer reads the contract, THEN they can implement endpoints without consulting UI code.
- WHEN membership schemas are reviewed, THEN they contain no role/admin/owner field.

## Regression / Compatibility Tests

- Tina SHALL add a static contract test for route presence and membership schema shape.

## Out Of Scope

Endpoint implementation.
