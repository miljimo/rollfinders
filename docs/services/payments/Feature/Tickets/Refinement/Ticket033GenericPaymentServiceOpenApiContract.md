# 033 - Define Generic Payment Allocation OpenAPI Contract

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: OpenAPI contract
- Priority: P0
- Branch: `feature/payments-generic-openapi-contract`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket003DefineOpenapiMvpContract
- Source PRD: `docs/services/payments/proposal.md`

## Task

Update the Payment Service OpenAPI contract so payments, checkouts, allocations, payees, payee accounts, commission policies, refunds, settlements, and reports are modeled generically and can be reused by RollFinders and future services.

## Implementation Notes

- Keep `/v1/payments`, `/v1/checkouts`, refunds, webhooks, health, ready, and metrics compatible with existing consumers.
- Add schema fields for `client_id`, `resource_type`, `resource_id`, `resource_label`, `settlement_route`, `payee_id`, `commission_policy_id`, and allocation lines.
- Add generic endpoints for payees, payee accounts, commission policies, allocations, settlements, and reports.
- Document stable error codes for allocation, payee, account, commission policy, settlement, and refund failures.
- Do not include academy, course, seminar, open mat, or RollFinders-only concepts in service-owned schemas.

## Acceptance Criteria

- WHEN the OpenAPI document is reviewed, THEN the API model uses generic resource and payee terminology.
- WHEN existing payment consumers use current MVP fields, THEN the new contract remains backward-compatible or explicitly documents migration defaults.
- WHEN a RollFinders academy payment is described, THEN the contract maps it through generic payee/resource fields.
- WHEN a future non-academy service integrates, THEN no domain-specific schema additions are required.

## Regression / Compatibility Tests

- Tina SHALL verify existing checkout, payment creation, refund, webhook, and payment history examples remain valid.
- Tina SHALL add or update contract tests that assert academy/course terms do not appear in Payment Service core schemas.

## Out Of Scope

Implementing the endpoints.
