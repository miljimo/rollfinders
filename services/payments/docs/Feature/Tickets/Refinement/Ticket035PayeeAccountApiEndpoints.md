# 035 - Implement Generic Payee Account API Endpoints

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: Payee and payee account APIs
- Priority: P0
- Branch: `feature/payments-payee-account-api`
- Developer owner: Payments Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket013ImplementApiAuthentication, Ticket034GenericPayeeAndAccountSchema
- Source PRD: `services/payments/docs/PaymentService.md`

## Task

Implement generic payee and payee account endpoints.

## Implementation Notes

- Implement `POST /v1/payees`.
- Implement `GET /v1/payees/{payee_id}`.
- Implement `GET /v1/payees`.
- Implement `PATCH /v1/payees/{payee_id}`.
- Implement `DELETE /v1/payees/{payee_id}` as deactivation, not hard delete.
- Implement `POST /v1/payees/{payee_id}/accounts`.
- Implement `GET /v1/payees/{payee_id}/accounts`.
- Implement `GET /v1/payees/{payee_id}/accounts/{account_id}`.
- Implement `POST /v1/payees/{payee_id}/accounts/onboarding-link`.
- Implement `POST /v1/payees/{payee_id}/accounts/{account_id}/refresh`.
- Require `Idempotency-Key` for mutating endpoints.

## Acceptance Criteria

- WHEN a client creates a payee, THEN the service stores a generic payee without domain-specific fields.
- WHEN a client creates a payee account, THEN the service stores the provider account reference and canonical account status.
- WHEN an onboarding link is requested, THEN the service returns a provider-safe URL or a normalized provider error.
- WHEN the same mutating request is retried with the same idempotency key, THEN no duplicate payee/account action is created.

## Regression / Compatibility Tests

- Tina SHALL add API integration tests for create/get/list/update/deactivate payee flows.
- Tina SHALL verify authentication and idempotency behavior matches existing payment endpoints.

## Out Of Scope

RollFinders dashboard UI.
