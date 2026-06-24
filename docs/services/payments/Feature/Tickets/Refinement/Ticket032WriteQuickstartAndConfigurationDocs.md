# 032 - Write Quickstart And Configuration Docs

## Feature / Component

- Feature: Documentation
- Component: Developer docs
- Priority: P1
- Suggested owner: Product Owner
- Dependencies: Ticket002ContainerizeServiceAndLocalCompose, Ticket016ImplementCreatePaymentEndpoint, Ticket019ImplementRefundEndpoint, Ticket021ImplementWebhookIngestionEndpoint

## Task

Document local setup, environment variables, Stripe and PayPal sandbox configuration, idempotency behavior, webhooks, and sample curl flows.

## Implementation Notes

- Docs should let a new integrator reach first sandbox payment quickly.
- Clarify that no raw card data goes through the backend.
- Clarify that Braintree and Adyen are future candidates, not v1 setup steps.

## Acceptance Criteria

- WHEN a new engineer follows the quickstart, THEN they can run the service locally.
- WHEN configuring Stripe, THEN required environment variables and webhook secrets are documented.
- WHEN configuring PayPal, THEN required environment variables and webhook verification settings are documented.
- IF a required environment variable is missing, THEN docs describe expected startup behavior.
- WHEN idempotency is described, THEN clients know which endpoints require keys and how retries behave.

## Out Of Scope

Video tutorials, hosted docs site, SDK-specific guides.
