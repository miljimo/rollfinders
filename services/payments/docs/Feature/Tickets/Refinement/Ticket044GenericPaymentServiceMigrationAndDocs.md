# 044 - Update Migration, Configuration, And Developer Docs

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: Documentation and migration guide
- Priority: P1
- Branch: `docs/payments-generic-service-migration`
- Developer owner: Technical Writer / Payments Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket033GenericPaymentServiceOpenApiContract, Ticket042RollFindersGenericPaymentIntegration
- Source PRD: `services/payments/docs/paymentService.md`

## Task

Document how existing clients migrate from simple payments to the generic payment allocation model.

## Implementation Notes

- Update Payment Service README.
- Update OpenAPI examples.
- Add examples for platform settlement and connected payee settlement.
- Add RollFinders mapping examples.
- Document required environment variables for provider connected account support.
- Document idempotency and webhook behavior.
- Document backward compatibility expectations for existing checkout/payment payloads.

## Acceptance Criteria

- WHEN a developer reads the docs, THEN they can create a platform-settled payment.
- WHEN a developer reads the docs, THEN they can create a connected-payee-settled payment.
- WHEN a developer reads the docs, THEN they understand how RollFinders academies map to generic payees.
- WHEN a developer reads the docs, THEN they understand how refunds affect allocations and settlements.

## Regression / Compatibility Tests

- Tina SHALL run documented curl examples against local Docker where practical.
- Tina SHALL verify examples do not include domain-specific fields in Payment Service core payloads.

## Out Of Scope

Implementing missing APIs.
