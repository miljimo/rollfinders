# 043 - Build Generic Payment Service Regression Suite

## Feature / Component

- Feature: Generic Payment Allocation Service
- Component: Test suite
- Priority: P0
- Branch: `test/payments-generic-regression-suite`
- Developer owner: Test Automation Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket037PaymentAllocationCreateFlow, Ticket040RefundAllocationAwareness, Ticket041GenericProviderWebhookExpansion, Ticket042RollFindersGenericPaymentIntegration
- Source PRD: `docs/services/payments/proposal.md`

## Task

Create a regression suite proving the generic payment service changes do not break existing payment, checkout, refund, webhook, and RollFinders UI flows.

## Test Scope

- Existing `POST /v1/checkouts` flow.
- Existing `POST /v1/payments` flow.
- Existing Stripe sandbox checkout e2e.
- Existing refund flow.
- Existing webhook ingestion.
- Existing RollFinders course/event checkout UI.
- Existing payment dashboard.
- New payee account onboarding API.
- New connected payee settlement payment.
- New allocation reporting.
- New refund allocation reversal.

## Acceptance Criteria

- WHEN the regression suite runs locally, THEN existing MVP payment tests pass.
- WHEN the regression suite runs against sandbox Stripe, THEN normal Stripe checkout still returns a sandbox Checkout URL.
- WHEN a connected payee payment is simulated, THEN payment allocations and platform commission are stored.
- WHEN a provider-side refund webhook is simulated, THEN refund state and allocation reversal are stored.
- WHEN RollFinders queries payment history, THEN both platform and connected payee settlement records are visible.

## Deliverables

- Unit tests for allocation math.
- API integration tests for new endpoints.
- Provider adapter contract tests.
- Webhook idempotency tests.
- RollFinders integration tests or Playwright scenarios where practical.

## Out Of Scope

Production deployment.
