# 003 - Define OpenAPI MVP Contract

## Feature / Component

- Feature: API Contract
- Component: OpenAPI
- Priority: P0
- Suggested owner: Technical Architect
- Dependencies: Ticket001BootstrapGoApiService

## Task

Create the source-of-truth OpenAPI contract for v1 payment, refund, webhook, health, and error APIs.

## Implementation Notes

- Document only Stripe cards and PayPal wallet as v1 providers.
- Document Braintree and Adyen as out of scope for v1.
- Include examples for payment creation, action-required responses, refunds, and errors.

## Acceptance Criteria

- WHEN the OpenAPI document is validated, THEN it passes schema validation.
- IF an endpoint requires `Idempotency-Key`, THEN the required header is documented.
- WHEN payment creation is documented, THEN request and response examples include amount, currency, provider, status, and next action fields.
- IF a request would submit raw card data, THEN the API contract provides no field for PAN or CVV.
- WHEN errors are documented, THEN they use a consistent machine-readable envelope.

## Out Of Scope

SDK generation, hosted developer portal, non-MVP provider APIs.
